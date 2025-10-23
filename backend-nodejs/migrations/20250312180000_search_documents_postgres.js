import { isPostgres } from './_helpers/schema.js';

export async function up(knex) {
  if (!isPostgres(knex)) {
    console.warn('Skipping search documents migration because the database is not PostgreSQL.');
    return;
  }

  await knex.schema.raw('CREATE SCHEMA IF NOT EXISTS search');

  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS search.documents (
      entity_type text NOT NULL,
      entity_id bigint NOT NULL,
      slug text,
      title text NOT NULL,
      subtitle text,
      summary text,
      description text,
      tags text[] NOT NULL DEFAULT ARRAY[]::text[],
      filters jsonb NOT NULL DEFAULT '{}'::jsonb,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      media jsonb NOT NULL DEFAULT '{}'::jsonb,
      search_vector tsvector NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (entity_type, entity_id)
    );
  `);

  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS documents_search_vector_idx ON search.documents USING GIN(search_vector)'
  );
  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS documents_filters_idx ON search.documents USING GIN(filters)'
  );

  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION search.normalise_text_array(values text[])
    RETURNS text[]
    LANGUAGE SQL
    IMMUTABLE
    AS $$
      SELECT COALESCE(
        ARRAY(
          SELECT DISTINCT trim(entry)
          FROM unnest(values) AS entry
          WHERE entry IS NOT NULL AND trim(entry) <> ''
        ),
        ARRAY[]::text[]
      );
    $$;
  `);

  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION search.build_keyword_payload(VARIADIC values text[])
    RETURNS jsonb
    LANGUAGE plpgsql
    IMMUTABLE
    AS $$
    DECLARE
      keyword text;
      acc jsonb := '[]'::jsonb;
    BEGIN
      FOREACH keyword IN ARRAY values LOOP
        IF keyword IS NOT NULL AND btrim(keyword) <> '' THEN
          acc := acc || to_jsonb(keyword);
        END IF;
      END LOOP;
      RETURN jsonb_build_object('keywords', acc);
    END;
    $$;
  `);

  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION search.compute_document_vector(
      title text,
      summary text,
      description text,
      tags text[],
      extra jsonb
    )
    RETURNS tsvector
    LANGUAGE SQL
    IMMUTABLE
    AS $$
      SELECT
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'C') ||
        setweight(
          to_tsvector('simple', array_to_string(search.normalise_text_array(tags), ' ')),
          'B'
        ) ||
        setweight(
          to_tsvector(
            'simple',
            array_to_string(
              ARRAY(
                SELECT keyword
                FROM jsonb_array_elements_text(COALESCE(extra -> 'keywords', '[]'::jsonb)) AS keyword
                WHERE keyword IS NOT NULL AND keyword <> ''
              ),
              ' '
            )
          ),
          'D'
        );
    $$;
  `);

  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION search.refresh_document(p_entity text, p_id bigint)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      updated integer := 0;
    BEGIN
      IF p_entity = 'courses' THEN
        WITH payload AS (
          SELECT
            c.id,
            c.slug,
            c.title,
            c.summary,
            c.description,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(c.tags::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS tags,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(c.skills::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS skills,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(c.languages::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS languages,
            NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), '') AS instructor_name,
            c.level,
            c.category,
            c.delivery_format,
            c.price_currency,
            c.price_amount,
            c.rating_average,
            c.rating_count,
            c.enrolment_count,
            c.release_at,
            c.status,
            c.is_published,
            c.thumbnail_url,
            c.hero_image_url,
            c.trailer_url,
            c.promo_video_url,
            c.syllabus_url
          FROM courses c
          LEFT JOIN users u ON u.id = c.instructor_id
          WHERE c.id = p_id
        )
        INSERT INTO search.documents AS d (
          entity_type,
          entity_id,
          slug,
          title,
          subtitle,
          summary,
          description,
          tags,
          filters,
          metadata,
          media,
          search_vector,
          updated_at
        )
        SELECT
          'courses',
          payload.id,
          payload.slug,
          payload.title,
          payload.instructor_name,
          payload.summary,
          payload.description,
          search.normalise_text_array(payload.tags),
          jsonb_strip_nulls(jsonb_build_object(
            'level', payload.level,
            'category', payload.category,
            'deliveryFormat', payload.delivery_format,
            'price.currency', payload.price_currency,
            'price.amount', payload.price_amount,
            'languages', to_jsonb(payload.languages),
            'skills', to_jsonb(payload.skills),
            'tags', to_jsonb(payload.tags)
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'instructorName', payload.instructor_name,
            'price', jsonb_build_object('currency', payload.price_currency, 'amount', payload.price_amount),
            'rating', jsonb_build_object('average', payload.rating_average, 'count', payload.rating_count),
            'enrolmentCount', payload.enrolment_count,
            'releaseAt', payload.release_at,
            'status', payload.status,
            'isPublished', payload.is_published,
            'category', payload.category,
            'level', payload.level
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'thumbnailUrl', payload.thumbnail_url,
            'heroImageUrl', payload.hero_image_url,
            'trailerUrl', payload.trailer_url,
            'promoVideoUrl', payload.promo_video_url,
            'syllabusUrl', payload.syllabus_url
          )),
          search.compute_document_vector(
            payload.title,
            payload.summary,
            payload.description,
            payload.tags,
            search.build_keyword_payload(
              payload.instructor_name,
              payload.category,
              payload.level,
              VARIADIC search.normalise_text_array(payload.tags || payload.skills || payload.languages)
            )
          ),
          now()
        FROM payload
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          tags = EXCLUDED.tags,
          filters = EXCLUDED.filters,
          metadata = EXCLUDED.metadata,
          media = EXCLUDED.media,
          search_vector = EXCLUDED.search_vector,
          updated_at = EXCLUDED.updated_at;
        GET DIAGNOSTICS updated = ROW_COUNT;
      ELSIF p_entity = 'communities' THEN
        WITH payload AS (
          SELECT
            c.id,
            c.slug,
            c.name,
            c.description,
            c.visibility,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(c.metadata -> 'tags', '[]'::jsonb)) AS value), ARRAY[]::text[]) AS tags,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(c.metadata -> 'languages', '[]'::jsonb)) AS value), ARRAY[]::text[]) AS languages,
            c.metadata ->> 'category' AS category,
            c.metadata ->> 'timezone' AS timezone,
            c.metadata ->> 'country' AS country,
            c.metadata ->> 'tagline' AS tagline,
            c.metadata ->> 'shortDescription' AS short_description,
            c.metadata ->> 'coverImageUrl' AS cover_image_url,
            c.metadata ->> 'memberCount' AS member_count,
            c.metadata ->> 'trendScore' AS trend_score
          FROM communities c
          WHERE c.id = p_id AND c.deleted_at IS NULL
        )
        INSERT INTO search.documents AS d (
          entity_type,
          entity_id,
          slug,
          title,
          subtitle,
          summary,
          description,
          tags,
          filters,
          metadata,
          media,
          search_vector,
          updated_at
        )
        SELECT
          'communities',
          payload.id,
          payload.slug,
          payload.name,
          payload.tagline,
          payload.short_description,
          payload.description,
          search.normalise_text_array(payload.tags),
          jsonb_strip_nulls(jsonb_build_object(
            'visibility', payload.visibility,
            'category', payload.category,
            'timezone', payload.timezone,
            'languages', to_jsonb(payload.languages),
            'country', payload.country,
            'tags', to_jsonb(payload.tags)
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'memberCount', payload.member_count,
            'trendScore', payload.trend_score,
            'country', payload.country,
            'category', payload.category
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'coverImageUrl', payload.cover_image_url
          )),
          search.compute_document_vector(
            payload.name,
            payload.short_description,
            payload.description,
            payload.tags,
            search.build_keyword_payload(
              payload.category,
              payload.visibility,
              payload.country,
              VARIADIC search.normalise_text_array(payload.tags || payload.languages)
            )
          ),
          now()
        FROM payload
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          tags = EXCLUDED.tags,
          filters = EXCLUDED.filters,
          metadata = EXCLUDED.metadata,
          media = EXCLUDED.media,
          search_vector = EXCLUDED.search_vector,
          updated_at = EXCLUDED.updated_at;
        GET DIAGNOSTICS updated = ROW_COUNT;
      ELSIF p_entity = 'tutors' THEN
        WITH payload AS (
          SELECT
            t.id,
            t.display_name,
            t.headline,
            t.bio,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(t.skills::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS skills,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(t.languages::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS languages,
            t.country,
            t.rating_average,
            t.rating_count,
            t.completed_sessions,
            t.response_time_minutes,
            t.hourly_rate_currency,
            t.hourly_rate_amount,
            t.is_verified,
            t.metadata
          FROM tutor_profiles t
          WHERE t.id = p_id
        )
        INSERT INTO search.documents AS d (
          entity_type,
          entity_id,
          slug,
          title,
          subtitle,
          summary,
          description,
          tags,
          filters,
          metadata,
          media,
          search_vector,
          updated_at
        )
        SELECT
          'tutors',
          payload.id,
          NULL,
          payload.display_name,
          payload.headline,
          NULL,
          payload.bio,
          search.normalise_text_array(payload.skills),
          jsonb_strip_nulls(jsonb_build_object(
            'languages', to_jsonb(payload.languages),
            'skills', to_jsonb(payload.skills),
            'country', payload.country,
            'isVerified', payload.is_verified,
            'hourlyRate.amount', payload.hourly_rate_amount,
            'hourlyRate.currency', payload.hourly_rate_currency
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'rating', jsonb_build_object('average', payload.rating_average, 'count', payload.rating_count),
            'completedSessions', payload.completed_sessions,
            'responseTimeMinutes', payload.response_time_minutes,
            'country', payload.country,
            'isVerified', payload.is_verified,
            'hourlyRate', jsonb_build_object('amount', payload.hourly_rate_amount, 'currency', payload.hourly_rate_currency)
          )),
          '{}'::jsonb,
          search.compute_document_vector(
            payload.display_name,
            payload.headline,
            payload.bio,
            payload.skills,
            search.build_keyword_payload(
              payload.country,
              VARIADIC search.normalise_text_array(payload.skills || payload.languages)
            )
          ),
          now()
        FROM payload
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          tags = EXCLUDED.tags,
          filters = EXCLUDED.filters,
          metadata = EXCLUDED.metadata,
          search_vector = EXCLUDED.search_vector,
          updated_at = EXCLUDED.updated_at;
        GET DIAGNOSTICS updated = ROW_COUNT;
      ELSIF p_entity = 'tickets' THEN
        WITH payload AS (
          SELECT
            c.id,
            c.reference,
            c.subject,
            c.category,
            c.priority,
            c.status,
            c.channel,
            c.satisfaction,
            c.metadata,
            u.email
          FROM learner_support_cases c
          LEFT JOIN users u ON u.id = c.user_id
          WHERE c.id = p_id
        )
        INSERT INTO search.documents AS d (
          entity_type,
          entity_id,
          slug,
          title,
          subtitle,
          summary,
          description,
          tags,
          filters,
          metadata,
          media,
          search_vector,
          updated_at
        )
        SELECT
          'tickets',
          payload.id,
          payload.reference,
          payload.subject,
          payload.category,
          payload.metadata ->> 'summary',
          payload.metadata ->> 'description',
          ARRAY[payload.category::text],
          jsonb_strip_nulls(jsonb_build_object(
            'category', payload.category,
            'priority', payload.priority,
            'status', payload.status,
            'channel', payload.channel
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'reference', payload.reference,
            'satisfaction', payload.satisfaction,
            'channel', payload.channel,
            'requester', payload.email
          )),
          '{}'::jsonb,
          search.compute_document_vector(
            payload.subject,
            payload.category,
            payload.metadata ->> 'description',
            ARRAY[payload.category::text],
            search.build_keyword_payload(
              payload.priority,
              payload.status,
              payload.channel,
              payload.email
            )
          ),
          now()
        FROM payload
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          tags = EXCLUDED.tags,
          filters = EXCLUDED.filters,
          metadata = EXCLUDED.metadata,
          search_vector = EXCLUDED.search_vector,
          updated_at = EXCLUDED.updated_at;
        GET DIAGNOSTICS updated = ROW_COUNT;
      ELSIF p_entity = 'ebooks' THEN
        WITH payload AS (
          SELECT
            e.id,
            e.slug,
            e.title,
            e.subtitle,
            e.description,
            e.price_currency,
            e.price_amount,
            e.rating_average,
            e.rating_count,
            e.reading_time_minutes,
            e.status,
            e.cover_image_url,
            e.sample_download_url,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(e.tags::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS tags,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(e.categories::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS categories,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(e.languages::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS languages
          FROM ebooks e
          WHERE e.id = p_id
        )
        INSERT INTO search.documents AS d (
          entity_type,
          entity_id,
          slug,
          title,
          subtitle,
          summary,
          description,
          tags,
          filters,
          metadata,
          media,
          search_vector,
          updated_at
        )
        SELECT
          'ebooks',
          payload.id,
          payload.slug,
          payload.title,
          payload.subtitle,
          payload.subtitle,
          payload.description,
          search.normalise_text_array(payload.tags),
          jsonb_strip_nulls(jsonb_build_object(
            'categories', to_jsonb(payload.categories),
            'languages', to_jsonb(payload.languages),
            'tags', to_jsonb(payload.tags)
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'price', jsonb_build_object('currency', payload.price_currency, 'amount', payload.price_amount),
            'rating', jsonb_build_object('average', payload.rating_average, 'count', payload.rating_count),
            'readingTimeMinutes', payload.reading_time_minutes,
            'status', payload.status
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'coverImageUrl', payload.cover_image_url,
            'sampleDownloadUrl', payload.sample_download_url
          )),
          search.compute_document_vector(
            payload.title,
            payload.subtitle,
            payload.description,
            payload.tags,
            search.build_keyword_payload(
              VARIADIC search.normalise_text_array(payload.tags || payload.categories || payload.languages)
            )
          ),
          now()
        FROM payload
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          tags = EXCLUDED.tags,
          filters = EXCLUDED.filters,
          metadata = EXCLUDED.metadata,
          media = EXCLUDED.media,
          search_vector = EXCLUDED.search_vector,
          updated_at = EXCLUDED.updated_at;
        GET DIAGNOSTICS updated = ROW_COUNT;
      ELSIF p_entity = 'ads' THEN
        WITH payload AS (
          SELECT
            a.id,
            a.public_id,
            a.name,
            a.objective,
            a.status,
            a.performance_score,
            a.ctr,
            a.budget_currency,
            a.budget_daily_cents,
            a.spend_currency,
            a.spend_total_cents,
            a.creative_description,
            a.creative_url,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(a.targeting_keywords::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS keywords,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(a.targeting_audiences::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS audiences,
            COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(COALESCE(a.targeting_locations::jsonb, '[]'::jsonb)) AS value), ARRAY[]::text[]) AS locations
          FROM ads_campaigns a
          WHERE a.id = p_id
        )
        INSERT INTO search.documents AS d (
          entity_type,
          entity_id,
          slug,
          title,
          subtitle,
          summary,
          description,
          tags,
          filters,
          metadata,
          media,
          search_vector,
          updated_at
        )
        SELECT
          'ads',
          payload.id,
          payload.public_id,
          payload.name,
          payload.objective,
          payload.creative_description,
          payload.creative_description,
          search.normalise_text_array(payload.keywords),
          jsonb_strip_nulls(jsonb_build_object(
            'objective', payload.objective,
            'status', payload.status
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'performanceScore', payload.performance_score,
            'ctr', payload.ctr,
            'budget', jsonb_build_object('currency', payload.budget_currency, 'amount', payload.budget_daily_cents),
            'spend', jsonb_build_object('currency', payload.spend_currency, 'amount', payload.spend_total_cents)
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'creativeUrl', payload.creative_url
          )),
          search.compute_document_vector(
            payload.name,
            payload.objective,
            payload.creative_description,
            payload.keywords,
            search.build_keyword_payload(
              payload.status,
              VARIADIC search.normalise_text_array(payload.keywords || payload.audiences || payload.locations)
            )
          ),
          now()
        FROM payload
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          tags = EXCLUDED.tags,
          filters = EXCLUDED.filters,
          metadata = EXCLUDED.metadata,
          media = EXCLUDED.media,
          search_vector = EXCLUDED.search_vector,
          updated_at = EXCLUDED.updated_at;
        GET DIAGNOSTICS updated = ROW_COUNT;
      ELSIF p_entity = 'events' THEN
        WITH payload AS (
          SELECT
            e.id,
            e.slug,
            e.title,
            e.summary,
            e.description,
            e.start_at,
            e.timezone,
            e.status,
            e.visibility,
            e.attendance_limit,
            e.attendance_count,
            COALESCE(c.metadata ->> 'country', '') AS community_country,
            c.name AS community_name,
            e.metadata
          FROM community_events e
          LEFT JOIN communities c ON c.id = e.community_id
          WHERE e.id = p_id
        )
        INSERT INTO search.documents AS d (
          entity_type,
          entity_id,
          slug,
          title,
          subtitle,
          summary,
          description,
          tags,
          filters,
          metadata,
          media,
          search_vector,
          updated_at
        )
        SELECT
          'events',
          payload.id,
          payload.slug,
          payload.title,
          payload.community_name,
          payload.summary,
          payload.description,
          ARRAY[payload.visibility::text],
          jsonb_strip_nulls(jsonb_build_object(
            'status', payload.status,
            'timezone', payload.timezone,
            'visibility', payload.visibility
          )),
          jsonb_strip_nulls(jsonb_build_object(
            'startAt', payload.start_at,
            'attendance', jsonb_build_object('limit', payload.attendance_limit, 'count', payload.attendance_count),
            'communityName', payload.community_name,
            'communityCountry', payload.community_country
          )),
          '{}'::jsonb,
          search.compute_document_vector(
            payload.title,
            payload.summary,
            payload.description,
            ARRAY[payload.visibility::text],
            search.build_keyword_payload(
              payload.community_name,
              payload.community_country,
              payload.timezone,
              payload.status
            )
          ),
          now()
        FROM payload
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          tags = EXCLUDED.tags,
          filters = EXCLUDED.filters,
          metadata = EXCLUDED.metadata,
          media = EXCLUDED.media,
          search_vector = EXCLUDED.search_vector,
          updated_at = EXCLUDED.updated_at;
        GET DIAGNOSTICS updated = ROW_COUNT;
      ELSE
        updated := 0;
      END IF;

      IF updated = 0 THEN
        DELETE FROM search.documents WHERE entity_type = p_entity AND entity_id = p_id;
      END IF;
    END;
    $$;
  `);

  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION search.refresh_all_documents()
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM search.refresh_document('courses', id) FROM courses;
      PERFORM search.refresh_document('communities', id) FROM communities WHERE deleted_at IS NULL;
      PERFORM search.refresh_document('tutors', id) FROM tutor_profiles;
      PERFORM search.refresh_document('tickets', id) FROM learner_support_cases;
      PERFORM search.refresh_document('ebooks', id) FROM ebooks;
      PERFORM search.refresh_document('ads', id) FROM ads_campaigns;
      PERFORM search.refresh_document('events', id) FROM community_events;
    END;
    $$;
  `);

  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION search.sync_document_trigger()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM search.refresh_document(TG_ARGV[0], OLD.id);
        RETURN OLD;
      END IF;
      PERFORM search.refresh_document(TG_ARGV[0], NEW.id);
      RETURN NEW;
    END;
    $$;
  `);

  const triggers = [
    { name: 'trg_search_courses', table: 'courses', entity: 'courses' },
    { name: 'trg_search_communities', table: 'communities', entity: 'communities' },
    { name: 'trg_search_tutors', table: 'tutor_profiles', entity: 'tutors' },
    { name: 'trg_search_tickets', table: 'learner_support_cases', entity: 'tickets' },
    { name: 'trg_search_ebooks', table: 'ebooks', entity: 'ebooks' },
    { name: 'trg_search_ads', table: 'ads_campaigns', entity: 'ads' },
    { name: 'trg_search_events', table: 'community_events', entity: 'events' }
  ];

  for (const trigger of triggers) {
    await knex.schema.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${trigger.name}') THEN
          EXECUTE 'CREATE TRIGGER ${trigger.name} AFTER INSERT OR UPDATE OR DELETE ON ${trigger.table} FOR EACH ROW EXECUTE FUNCTION search.sync_document_trigger(''${trigger.entity}'')';
        END IF;
      END;
      $$;
    `);
  }

  await knex.schema.raw('SELECT search.refresh_all_documents()');
}

export async function down(knex) {
  if (!isPostgres(knex)) {
    return;
  }

  const triggers = [
    { name: 'trg_search_courses', table: 'courses' },
    { name: 'trg_search_communities', table: 'communities' },
    { name: 'trg_search_tutors', table: 'tutor_profiles' },
    { name: 'trg_search_tickets', table: 'learner_support_cases' },
    { name: 'trg_search_ebooks', table: 'ebooks' },
    { name: 'trg_search_ads', table: 'ads_campaigns' },
    { name: 'trg_search_events', table: 'community_events' }
  ];

  for (const trigger of triggers) {
    await knex.schema.raw(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${trigger.name}') THEN
          EXECUTE 'DROP TRIGGER ${trigger.name} ON ${trigger.table}';
        END IF;
      END;
      $$;
    `);
  }

  await knex.schema.raw('DROP FUNCTION IF EXISTS search.sync_document_trigger() CASCADE');
  await knex.schema.raw('DROP FUNCTION IF EXISTS search.refresh_all_documents()');
  await knex.schema.raw('DROP FUNCTION IF EXISTS search.refresh_document(text, bigint)');
  await knex.schema.raw('DROP FUNCTION IF EXISTS search.compute_document_vector(text, text, text, text[], jsonb)');
  await knex.schema.raw('DROP FUNCTION IF EXISTS search.build_keyword_payload(VARIADIC text[])');
  await knex.schema.raw('DROP FUNCTION IF EXISTS search.normalise_text_array(text[])');
  await knex.schema.raw('DROP INDEX IF EXISTS documents_filters_idx');
  await knex.schema.raw('DROP INDEX IF EXISTS documents_search_vector_idx');
  await knex.schema.raw('DROP TABLE IF EXISTS search.documents');
  await knex.schema.raw('DROP SCHEMA IF EXISTS search');
}
