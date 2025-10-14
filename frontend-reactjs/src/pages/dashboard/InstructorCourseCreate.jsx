import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import CourseCreationHeader from './instructor/courseCreation/CourseCreationHeader.jsx';
import CourseCreationSummaryCards from './instructor/courseCreation/CourseCreationSummaryCards.jsx';
import CourseBlueprintCard from './instructor/courseCreation/CourseBlueprintCard.jsx';
import CourseLifecyclePlanner from './instructor/courseCreation/CourseLifecyclePlanner.jsx';

const EMPTY_BLUEPRINTS = Object.freeze([]);
const EMPTY_LIFECYCLES = Object.freeze([]);

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
  const blueprints = useMemo(
    () => dashboard?.courses?.creationBlueprints ?? EMPTY_BLUEPRINTS,
    [dashboard]
  );
  const lifecycle = useMemo(
    () => dashboard?.courses?.lifecycle ?? EMPTY_LIFECYCLES,
    [dashboard]
  );

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

  const lifecycleSummary = useMemo(() => {
    if (!lifecycle.length) {
      return { activeDrips: 0, refresherCount: 0, videoCount: 0 };
    }
    return lifecycle.reduce(
      (acc, course) => {
        if (course?.drip?.schedule?.length) {
          acc.activeDrips += 1;
        }
        acc.refresherCount += course?.refresherLessons?.length ?? 0;
        acc.videoCount += course?.recordedVideos?.length ?? 0;
        return acc;
      },
      { activeDrips: 0, refresherCount: 0, videoCount: 0 }
    );
  }, [lifecycle]);

  const summaryCards = useMemo(
    () => {
      const cards = [
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
      ];
      if (lifecycle.length) {
        cards.push({
          label: 'Automation coverage',
          value: `${lifecycleSummary.activeDrips}/${lifecycle.length}`,
          helper: `${lifecycleSummary.refresherCount} refreshers · ${lifecycleSummary.videoCount} recorded assets`
        });
      }
      return cards;
    },
    [blueprints.length, lifecycle.length, lifecycleSummary, overview.averageReadiness, overview.modules, overview.outstanding]
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
      <CourseLifecyclePlanner lifecycles={lifecycle} />
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
