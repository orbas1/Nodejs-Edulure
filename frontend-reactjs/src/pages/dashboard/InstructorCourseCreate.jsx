import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import CourseCreationHeader from './instructor/courseCreation/CourseCreationHeader.jsx';
import CourseCreationSummaryCards from './instructor/courseCreation/CourseCreationSummaryCards.jsx';
import CourseBlueprintCard from './instructor/courseCreation/CourseBlueprintCard.jsx';

const EMPTY_BLUEPRINTS = Object.freeze([]);

const readinessNarrative = (score) => {
  if (score >= 80) return 'Launch-ready';
  if (score >= 50) return 'In build';
  if (score > 0) return 'Needs production';
  return 'Kick-off required';
};

export default function InstructorCourseCreate({
  onGenerateOutline,
  onImportFromNotion,
  onSyncFromLms
}) {
  const { dashboard, refresh } = useOutletContext();
  const creationBlueprints = dashboard?.courses?.creationBlueprints;
  const blueprints = creationBlueprints ?? EMPTY_BLUEPRINTS;
  const blueprints = useMemo(() => dashboard?.courses?.creationBlueprints ?? [], [dashboard]);

  const overview = useMemo(() => {
    if (blueprints.length === 0) {
      return {
        averageReadiness: 0,
        modules: 0,
        outstanding: 0
      };
    }
    const readinessTotal = blueprints.reduce((sum, blueprint) => sum + Number(blueprint.readiness ?? 0), 0);
    const modules = blueprints.reduce((sum, blueprint) => sum + Number(blueprint.moduleCount ?? 0), 0);
    const outstanding = blueprints.reduce((sum, blueprint) => sum + (blueprint.outstanding?.length ?? 0), 0);
    return {
      averageReadiness: Math.round(readinessTotal / blueprints.length),
      modules,
      outstanding
    };
  }, [blueprints]);

  const summaryCards = useMemo(
    () => [
      {
        label: 'Active blueprints',
        value: blueprints.length,
        helper: 'Cohorts with production scaffolding'
      },
      {
        label: 'Average readiness',
        value: `${overview.averageReadiness}%`,
        helper: readinessNarrative(overview.averageReadiness)
      },
      {
        label: 'Modules in build',
        value: overview.modules,
        helper: `${overview.outstanding} outstanding tasks`
      }
    ],
    [blueprints.length, overview.averageReadiness, overview.modules, overview.outstanding]
  );

  if (blueprints.length === 0) {
    return (
      <DashboardStateMessage
        title="No blueprints configured"
        description="Create your first course structure to orchestrate lesson beats, assignments, and launch cadences."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-10">
      <CourseCreationHeader
        onGenerateOutline={onGenerateOutline}
        onImportFromNotion={onImportFromNotion}
        onSyncFromLms={onSyncFromLms}
      />
      <CourseCreationSummaryCards cards={summaryCards} />
      <section className="space-y-6">
        {blueprints.map((blueprint) => (
          <CourseBlueprintCard key={blueprint.id} blueprint={blueprint} />
        ))}
      </section>
    </div>
  );
}

InstructorCourseCreate.propTypes = {
  onGenerateOutline: PropTypes.func,
  onImportFromNotion: PropTypes.func,
  onSyncFromLms: PropTypes.func
};

InstructorCourseCreate.defaultProps = {
  onGenerateOutline: undefined,
  onImportFromNotion: undefined,
  onSyncFromLms: undefined
};
