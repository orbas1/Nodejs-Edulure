import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import AdminCrudResource from '../../../components/dashboard/admin/AdminCrudResource.jsx';
import adminControlApi from '../../../api/adminControlApi.js';
import { formatCurrency, createAdminControlResourceConfigs } from '../../dashboard/admin/adminControlConfig.jsx';

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

SummaryCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  helper: PropTypes.string
};

SummaryCard.defaultProps = {
  helper: undefined
};

function useCourseConfig() {
  return useMemo(() => {
    const configs = createAdminControlResourceConfigs();
    return configs.courses;
  }, []);
}

function calculateInsights(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      total: 0,
      published: 0,
      draft: 0,
      averagePrice: 0,
      upcoming: 0
    };
  }

  const totals = items.reduce(
    (acc, course) => {
      const status = course.status ?? 'draft';
      acc.total += 1;
      if (status === 'published') acc.published += 1;
      if (status === 'draft' || status === 'review') acc.draft += 1;
      if (course.releaseAt) {
        const releaseDate = new Date(course.releaseAt);
        if (!Number.isNaN(releaseDate.getTime()) && releaseDate > new Date()) {
          acc.upcoming += 1;
        }
      }
      if (course.priceAmount) {
        acc.priceTotal += Number(course.priceAmount ?? 0);
      }
      return acc;
    },
    { total: 0, published: 0, draft: 0, upcoming: 0, priceTotal: 0 }
  );

  const averagePrice = totals.total === 0 ? 0 : totals.priceTotal / totals.total;

  return {
    total: totals.total,
    published: totals.published,
    draft: totals.draft,
    upcoming: totals.upcoming,
    averagePrice
  };
}

export default function AdminCoursesSection({ sectionId, token }) {
  const config = useCourseConfig();
  const [insights, setInsights] = useState({ total: 0, published: 0, draft: 0, averagePrice: 0, upcoming: 0 });

  const handleItemsChange = useCallback((items) => {
    setInsights(calculateInsights(items));
  }, []);

  if (!config) {
    return null;
  }

  const summaryCards = [
    { label: 'Total courses', value: insights.total },
    { label: 'Published', value: insights.published },
    { label: 'In pipeline', value: insights.upcoming },
    {
      label: 'Average price',
      value: formatCurrency(insights.averagePrice, 'USD'),
      helper: `${insights.draft} drafts awaiting publication`
    }
  ];

  return (
    <section id={sectionId} className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Course catalogue</h2>
        <p className="text-sm text-slate-600">
          Manage programme inventory, publishing cadence, and pricing visibility across the Edulure marketplace.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>
      <AdminCrudResource
        token={token}
        title={config.title}
        description={config.description}
        entityName={config.entityName}
        listRequest={({ token: authToken, params, signal }) =>
          adminControlApi.listCourses({ token: authToken, params: { ...params, perPage: 50 }, signal })
        }
        createRequest={({ token: authToken, payload }) => adminControlApi.createCourse({ token: authToken, payload })}
        updateRequest={({ token: authToken, id, payload }) =>
          adminControlApi.updateCourse({ token: authToken, id, payload })
        }
        deleteRequest={({ token: authToken, id }) => adminControlApi.deleteCourse({ token: authToken, id })}
        fields={config.fields}
        columns={config.columns}
        searchPlaceholder="Search courses"
        onItemsChange={handleItemsChange}
      />
    </section>
  );
}

AdminCoursesSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string
};

AdminCoursesSection.defaultProps = {
  sectionId: 'courses',
  token: null
};
