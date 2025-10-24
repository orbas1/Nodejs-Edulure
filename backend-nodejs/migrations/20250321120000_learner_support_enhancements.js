export async function up(knex) {
  const hasEscalationBreadcrumbs = await knex.schema.hasColumn('learner_support_cases', 'escalation_breadcrumbs');
  const hasKnowledgeSuggestions = await knex.schema.hasColumn('learner_support_cases', 'knowledge_suggestions');
  const hasAiSummary = await knex.schema.hasColumn('learner_support_cases', 'ai_summary');
  const hasFollowUpDueAt = await knex.schema.hasColumn('learner_support_cases', 'follow_up_due_at');
  const hasAiSummaryGeneratedAt = await knex.schema.hasColumn('learner_support_cases', 'ai_summary_generated_at');

  if (!hasEscalationBreadcrumbs || !hasKnowledgeSuggestions || !hasAiSummary || !hasFollowUpDueAt || !hasAiSummaryGeneratedAt) {
    await knex.schema.alterTable('learner_support_cases', (table) => {
      if (!hasEscalationBreadcrumbs) {
        table.json('escalation_breadcrumbs').nullable();
      }
      if (!hasKnowledgeSuggestions) {
        table.json('knowledge_suggestions').nullable();
      }
      if (!hasAiSummary) {
        table.text('ai_summary').nullable();
      }
      if (!hasFollowUpDueAt) {
        table.datetime('follow_up_due_at').nullable();
      }
      if (!hasAiSummaryGeneratedAt) {
        table.datetime('ai_summary_generated_at').nullable();
      }
    });
  }

  const hasSupportArticles = await knex.schema.hasTable('support_articles');
  if (!hasSupportArticles) {
    await knex.schema.createTable('support_articles', (table) => {
      table.increments('id').primary();
      table.string('slug', 120).notNullable().unique();
      table.string('title', 255).notNullable();
      table.string('summary', 512).notNullable();
      table.string('category', 120).notNullable();
      table.json('keywords').nullable();
      table.string('url', 512).notNullable();
      table.integer('minutes').unsigned().notNullable().defaultTo(3);
      table.integer('review_interval_days').unsigned().notNullable().defaultTo(90);
      table.decimal('helpfulness_score', 6, 2).notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('support_articles', (table) => {
      table.index(['category'], 'idx_support_articles_category');
      table.index(['helpfulness_score'], 'idx_support_articles_score');
    });
  } else {
    const hasReviewInterval = await knex.schema.hasColumn(
      'support_articles',
      'review_interval_days'
    );
    if (!hasReviewInterval) {
      await knex.schema.alterTable('support_articles', (table) => {
        table.integer('review_interval_days').unsigned().notNullable().defaultTo(90);
      });
    }
  }
}

export async function down(knex) {
  const hasEscalationBreadcrumbs = await knex.schema.hasColumn('learner_support_cases', 'escalation_breadcrumbs');
  const hasKnowledgeSuggestions = await knex.schema.hasColumn('learner_support_cases', 'knowledge_suggestions');
  const hasAiSummary = await knex.schema.hasColumn('learner_support_cases', 'ai_summary');
  const hasFollowUpDueAt = await knex.schema.hasColumn('learner_support_cases', 'follow_up_due_at');
  const hasAiSummaryGeneratedAt = await knex.schema.hasColumn('learner_support_cases', 'ai_summary_generated_at');

  await knex.schema.alterTable('learner_support_cases', (table) => {
    if (hasEscalationBreadcrumbs) {
      table.dropColumn('escalation_breadcrumbs');
    }
    if (hasKnowledgeSuggestions) {
      table.dropColumn('knowledge_suggestions');
    }
    if (hasAiSummary) {
      table.dropColumn('ai_summary');
    }
    if (hasFollowUpDueAt) {
      table.dropColumn('follow_up_due_at');
    }
    if (hasAiSummaryGeneratedAt) {
      table.dropColumn('ai_summary_generated_at');
    }
  });

  const hasSupportArticles = await knex.schema.hasTable('support_articles');
  if (hasSupportArticles) {
    const hasReviewInterval = await knex.schema.hasColumn(
      'support_articles',
      'review_interval_days'
    );
    if (hasReviewInterval) {
      await knex.schema.alterTable('support_articles', (table) => {
        table.dropColumn('review_interval_days');
      });
    }
    await knex.schema.dropTableIfExists('support_articles');
  }
}
