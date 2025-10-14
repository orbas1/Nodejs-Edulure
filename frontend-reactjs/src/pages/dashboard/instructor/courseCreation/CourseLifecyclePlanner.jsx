import PropTypes from 'prop-types';

function numberOrDash(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString();
  }
  return '—';
}

function RatingStars({ rating }) {
  const filled = Math.round(Number(rating ?? 0));
  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${rating} out of 5`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className={`text-lg ${index < filled ? 'text-amber-400' : 'text-slate-300'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

RatingStars.propTypes = {
  rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

RatingStars.defaultProps = {
  rating: 0
};

function SectionHeader({ kicker, title, helper }) {
  return (
    <header className="flex flex-col gap-1">
      <p className="dashboard-kicker">{kicker}</p>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {helper ? <p className="text-sm text-slate-500">{helper}</p> : null}
    </header>
  );
}

SectionHeader.propTypes = {
  kicker: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  helper: PropTypes.string
};

SectionHeader.defaultProps = {
  helper: undefined
};

export default function CourseLifecyclePlanner({ lifecycles }) {
  if (!lifecycles.length) {
    return null;
  }

  return (
    <section className="space-y-10">
      {lifecycles.map((course) => (
        <article key={course.id} className="dashboard-section space-y-8">
          <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="dashboard-kicker">Lifecycle orchestration</p>
              <h2 className="text-2xl font-semibold text-slate-900">{course.courseTitle}</h2>
              <p className="text-sm text-slate-500">
                Stage: <span className="font-semibold text-slate-700">{course.stage}</span> · {course.reviewSummary}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Mobile parity</p>
              <p className="text-xs uppercase tracking-wide text-primary">{course.mobile.status}</p>
              {course.mobile.experiences?.length ? (
                <p className="mt-1 text-xs text-slate-500">
                  Experiences:{' '}
                  <span className="font-medium text-slate-700">{course.mobile.experiences.join(' · ')}</span>
                </p>
              ) : null}
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  kicker="Drip automation"
                  title="Module release sequence"
                  helper={`Cadence ${course.drip.cadence} · Anchor ${course.drip.anchor.replace('-', ' ')} · ${course.drip.timezone}`}
                />
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  {course.drip.segments.map((segment) => (
                    <span key={segment} className="dashboard-pill px-3 py-1">
                      {segment}
                    </span>
                  ))}
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-600">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="pb-3 pr-4">Module</th>
                        <th className="pb-3 pr-4">Release</th>
                        <th className="pb-3 pr-4">Gating</th>
                        <th className="pb-3">Notifications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {course.drip.schedule.map((entry) => (
                        <tr key={entry.id} className="align-top">
                          <td className="py-3 pr-4 font-medium text-slate-900">{entry.title}</td>
                          <td className="py-3 pr-4 text-slate-600">{entry.releaseLabel}</td>
                          <td className="py-3 pr-4 text-slate-600">
                            <p>{entry.gating}</p>
                            {entry.prerequisites?.length ? (
                              <p className="text-xs text-slate-500">Prereqs: {entry.prerequisites.join(', ')}</p>
                            ) : null}
                          </td>
                          <td className="py-3 text-slate-600">
                            {entry.notifications?.length ? entry.notifications.join(' • ') : 'No alerts configured'}
                            {entry.workspace ? (
                              <p className="text-xs text-slate-500">Workspace: {entry.workspace}</p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  kicker="Module production"
                  title="Creation readiness"
                  helper="Track owners, quality gates, and outstanding tasks per module"
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {course.modules.map((module) => (
                    <div key={module.id} className="dashboard-card-muted space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{module.title}</p>
                          <p className="text-xs text-slate-500">Owner · {module.owner}</p>
                        </div>
                        <span className="dashboard-pill px-3 py-1 text-xs font-semibold text-primary">
                          {module.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Quality gate: {module.qualityGate}</p>
                      <p className="text-xs text-slate-500">Last updated {module.lastUpdated}</p>
                      {module.tasksOutstanding.length ? (
                        <ul className="space-y-1 text-xs text-rose-500">
                          {module.tasksOutstanding.map((task) => (
                            <li key={task} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-emerald-600">All requirements cleared.</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  kicker="Learner voice"
                  title="Course reviews"
                  helper="Social proof from operators and review boards"
                />
                <div className="mt-5 space-y-5">
                  {course.reviews.length ? (
                    course.reviews.map((review) => (
                      <article key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{review.reviewer}</p>
                            <p className="text-xs text-slate-500">
                              {[review.role, review.company].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <RatingStars rating={review.rating} />
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">{review.submittedAt}</p>
                          </div>
                        </div>
                        <h4 className="mt-3 text-sm font-semibold text-slate-800">{review.headline}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.feedback}</p>
                        <p className="mt-3 text-xs text-slate-500">
                          Delivery: <span className="font-medium text-slate-700">{review.delivery}</span> · Experience:{' '}
                          <span className="font-medium text-slate-700">{review.experience}</span>
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No reviews captured yet. Activate launch surveys to populate testimonials.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  kicker="Refresher cadences"
                  title="Retention clinics"
                  helper="Protect mastery with scheduled refresh sessions"
                />
                <div className="mt-5 space-y-4">
                  {course.refresherLessons.length ? (
                    course.refresherLessons.map((lesson) => (
                      <div key={lesson.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{lesson.title}</p>
                        <p className="text-xs text-slate-500">{lesson.format} · {lesson.cadence}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Host: <span className="font-medium text-slate-700">{lesson.owner}</span>
                        </p>
                        <p className="text-xs text-slate-500">Next session: {lesson.nextSession}</p>
                        <p className="text-xs text-slate-500">Channel: {lesson.channel}</p>
                        <p className="text-xs text-slate-500">Enrollment: {lesson.enrollmentWindow}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No refresher clinics configured. Add at least one to protect programme memory.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  kicker="Recorded experience"
                  title="Video assets"
                  helper="Ensure evergreen parity for web and mobile players"
                />
                <div className="mt-5 grid gap-4">
                  {course.recordedVideos.length ? (
                    course.recordedVideos.map((video) => (
                      <div key={video.id} className="dashboard-card-muted space-y-2 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{video.title}</p>
                          <span className="dashboard-pill px-3 py-1 text-xs text-primary">{video.status}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {video.duration} · {video.quality}
                          {video.size ? ` · ${video.size}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          Updated {video.updated} · {video.language} · {video.aspectRatio}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No recorded sessions uploaded yet. Sync from the studio encoder to populate this shelf.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  kicker="Catalogue placement"
                  title="Channel performance"
                  helper="Monitor impressions and conversion readiness per listing"
                />
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-600">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="pb-3 pr-4">Channel</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Price</th>
                        <th className="pb-3 pr-4">Impressions</th>
                        <th className="pb-3 pr-4">Conversions</th>
                        <th className="pb-3">Conversion rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {course.catalogue.length ? (
                        course.catalogue.map((listing) => (
                          <tr key={listing.id}>
                            <td className="py-3 pr-4 font-medium text-slate-900">{listing.channel}</td>
                            <td className="py-3 pr-4 text-slate-600">{listing.status}</td>
                            <td className="py-3 pr-4 text-slate-600">{listing.price}</td>
                            <td className="py-3 pr-4 text-slate-600">{numberOrDash(listing.impressions)}</td>
                            <td className="py-3 pr-4 text-slate-600">{numberOrDash(listing.conversions)}</td>
                            <td className="py-3 text-slate-600">
                              <div className="flex flex-col">
                                <span>{listing.conversionRate}</span>
                                <span className="text-xs text-slate-400">Synced {listing.lastSynced}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-sm text-slate-500">
                            No catalogue listings connected yet. Publish to marketplace or enterprise channels to enable tracking.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

CourseLifecyclePlanner.propTypes = {
  lifecycles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      courseTitle: PropTypes.string.isRequired,
      stage: PropTypes.string,
      reviewSummary: PropTypes.string,
      mobile: PropTypes.shape({
        status: PropTypes.string,
        experiences: PropTypes.arrayOf(PropTypes.string)
      }),
      drip: PropTypes.shape({
        cadence: PropTypes.string,
        anchor: PropTypes.string,
        timezone: PropTypes.string,
        segments: PropTypes.arrayOf(PropTypes.string),
        schedule: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            title: PropTypes.string,
            releaseLabel: PropTypes.string,
            gating: PropTypes.string,
            prerequisites: PropTypes.arrayOf(PropTypes.string),
            notifications: PropTypes.arrayOf(PropTypes.string),
            workspace: PropTypes.string
          })
        )
      }).isRequired,
      modules: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          title: PropTypes.string,
          status: PropTypes.string,
          owner: PropTypes.string,
          lastUpdated: PropTypes.string,
          qualityGate: PropTypes.string,
          tasksOutstanding: PropTypes.arrayOf(PropTypes.string)
        })
      ).isRequired,
      refresherLessons: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          title: PropTypes.string,
          format: PropTypes.string,
          cadence: PropTypes.string,
          owner: PropTypes.string,
          status: PropTypes.string,
          nextSession: PropTypes.string,
          channel: PropTypes.string,
          enrollmentWindow: PropTypes.string
        })
      ).isRequired,
      recordedVideos: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          title: PropTypes.string,
          duration: PropTypes.string,
          quality: PropTypes.string,
          status: PropTypes.string,
          updated: PropTypes.string,
          size: PropTypes.string,
          language: PropTypes.string,
          aspectRatio: PropTypes.string
        })
      ).isRequired,
      catalogue: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          channel: PropTypes.string,
          status: PropTypes.string,
          price: PropTypes.string,
          impressions: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          conversions: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          conversionRate: PropTypes.string,
          lastSynced: PropTypes.string
        })
      ).isRequired,
      reviews: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          reviewer: PropTypes.string,
          role: PropTypes.string,
          company: PropTypes.string,
          rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          headline: PropTypes.string,
          feedback: PropTypes.string,
          submittedAt: PropTypes.string,
          delivery: PropTypes.string,
          experience: PropTypes.string
        })
      ).isRequired
    })
  )
};

CourseLifecyclePlanner.defaultProps = {
  lifecycles: []
};
