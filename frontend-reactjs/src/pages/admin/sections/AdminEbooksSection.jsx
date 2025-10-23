import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import AdminSummaryCard from '../../../components/admin/AdminSummaryCard.jsx';
import AdminCrudResource from '../../../components/dashboard/admin/AdminCrudResource.jsx';
import adminControlApi from '../../../api/adminControlApi.js';
import { createAdminControlResourceConfigs } from '../../dashboard/admin/adminControlConfig.jsx';

function useEbookConfig() {
  return useMemo(() => {
    const configs = createAdminControlResourceConfigs();
    return configs.ebooks;
  }, []);
}

function calculateInsights(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      total: 0,
      published: 0,
      publicCount: 0,
      averageReadingTime: 0,
      draftCount: 0,
      mediaReady: 0
    };
  }

  const totals = items.reduce(
    (acc, ebook) => {
      const status = ebook.status ?? 'draft';
      acc.total += 1;
      if (status === 'published') acc.published += 1;
      if (status === 'draft' || status === 'review') acc.draft += 1;
      if (ebook.isPublic) acc.publicCount += 1;
      if (ebook.readingTimeMinutes) acc.readingTimeTotal += Number(ebook.readingTimeMinutes ?? 0);
      if (ebook.coverImageUrl || ebook.sampleDownloadUrl || ebook.audiobookUrl) {
        acc.mediaReady += 1;
      }
      return acc;
    },
    { total: 0, published: 0, draft: 0, publicCount: 0, readingTimeTotal: 0, mediaReady: 0 }
  );

  const averageReadingTime = totals.total === 0 ? 0 : Math.round(totals.readingTimeTotal / totals.total);

  return {
    total: totals.total,
    published: totals.published,
    publicCount: totals.publicCount,
    averageReadingTime,
    draftCount: totals.draft,
    mediaReady: totals.mediaReady
  };
}

export default function AdminEbooksSection({ sectionId, token }) {
  const config = useEbookConfig();
  const [insights, setInsights] = useState({
    total: 0,
    published: 0,
    publicCount: 0,
    averageReadingTime: 0,
    draftCount: 0,
    mediaReady: 0
  });

  const handleItemsChange = useCallback((items) => {
    setInsights(calculateInsights(items));
  }, []);

  if (!config) {
    return null;
  }

  const summaryCards = [
    { label: 'Total titles', value: insights.total },
    { label: 'Published', value: insights.published },
    { label: 'Public distribution', value: insights.publicCount, helper: `${insights.draftCount} in drafting` },
    {
      label: 'Avg. reading time',
      value: insights.averageReadingTime ? `${insights.averageReadingTime} mins` : 'N/A'
    },
    {
      label: 'Media ready',
      value: insights.mediaReady,
      helper: 'Titles with covers, samples, or audio editions'
    }
  ];

  return (
    <section id={sectionId} className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">E-book library</h2>
        <p className="text-sm text-slate-600">
          Curate, enrich, and launch immersive reading experiences with metadata, access tiers, and multilingual formats.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <AdminSummaryCard key={card.label} {...card} />
        ))}
      </div>
      <AdminCrudResource
        token={token}
        title={config.title}
        description={config.description}
        entityName={config.entityName}
        listRequest={({ token: authToken, params, signal }) =>
          adminControlApi.listEbooks({ token: authToken, params: { ...params, perPage: 50 }, signal })
        }
        createRequest={({ token: authToken, payload }) => adminControlApi.createEbook({ token: authToken, payload })}
        updateRequest={({ token: authToken, id, payload }) =>
          adminControlApi.updateEbook({ token: authToken, id, payload })
        }
        deleteRequest={({ token: authToken, id }) => adminControlApi.deleteEbook({ token: authToken, id })}
        fields={config.fields}
        columns={config.columns}
        searchPlaceholder="Search e-books"
        onItemsChange={handleItemsChange}
      />
    </section>
  );
}

AdminEbooksSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string
};

AdminEbooksSection.defaultProps = {
  sectionId: 'ebooks',
  token: null
};
