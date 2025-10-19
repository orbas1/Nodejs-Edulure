import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
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
  const { dashboard, refresh, instructorOrchestration } = useOutletContext();
  const [pendingAction, setPendingAction] = useState(null);
  const [feedback, setFeedback] = useState(null);
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

  const defaultGenerateOutline = useCallback(async () => {
    if (!instructorOrchestration?.generateCourseOutline) {
      return;
    }
    setPendingAction('generate');
    setFeedback(null);
    try {
      const payload = {
        courseId: blueprints[0]?.id,
        topic: blueprints[0]?.title,
        moduleCount: blueprints.length > 0 ? blueprints[0]?.moduleCount ?? blueprints.length * 4 : 6,
        outcomes: blueprints.flatMap((item) => item.outstanding ?? [])
      };
      const result = await instructorOrchestration.generateCourseOutline(payload);
      setFeedback({
        tone: 'success',
        message: 'Course outline orchestration triggered.',
        detail: result?.summary ?? 'We will notify you once drafting completes.'
      });
      await refresh?.();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error.message ?? 'Unable to orchestrate an outline right now.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [instructorOrchestration, blueprints, refresh]);

  const defaultImportFromNotion = useCallback(async () => {
    if (!instructorOrchestration?.importFromNotion) {
      return;
    }
    setPendingAction('notion');
    setFeedback(null);
    try {
      const payload = {
        workspaceId: dashboard?.courses?.workspaceId,
        sections: blueprints.map((item) => item.title)
      };
      const result = await instructorOrchestration.importFromNotion(payload);
      setFeedback({
        tone: 'success',
        message: 'Notion import queued.',
        detail: result?.summary ?? 'We will align sections to your blueprint shortly.'
      });
      await refresh?.();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error.message ?? 'Unable to import Notion content.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [dashboard, instructorOrchestration, blueprints, refresh]);

  const defaultSyncFromLms = useCallback(async () => {
    if (!instructorOrchestration?.syncFromLms) {
      return;
    }
    setPendingAction('lms');
    setFeedback(null);
    try {
      const payload = {
        provider: dashboard?.courses?.lmsProvider ?? 'manual',
        courseCode: blueprints[0]?.code
      };
      const result = await instructorOrchestration.syncFromLms(payload);
      setFeedback({
        tone: 'success',
        message: 'LMS synchronisation started.',
        detail: result?.summary ?? 'Your assets will refresh once the sync completes.'
      });
      await refresh?.();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error.message ?? 'Unable to sync from the LMS.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [dashboard, instructorOrchestration, blueprints, refresh]);

  const handleGenerateOutline = onGenerateOutline ?? defaultGenerateOutline;
  const handleImportFromNotion = onImportFromNotion ?? defaultImportFromNotion;
  const handleSyncFromLms = onSyncFromLms ?? defaultSyncFromLms;

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
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      <CourseCreationHeader
        onGenerateOutline={handleGenerateOutline}
        onImportFromNotion={handleImportFromNotion}
        onSyncFromLms={handleSyncFromLms}
        isGenerating={pendingAction === 'generate'}
        isImporting={pendingAction === 'notion'}
        isSyncing={pendingAction === 'lms'}
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
