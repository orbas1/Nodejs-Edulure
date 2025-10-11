import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import StatsBar from '../components/StatsBar.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import Testimonials from '../components/Testimonials.jsx';

export default function Home() {
  return (
    <div>
      <PageHero
        title="Build, launch, and scale high-performing learning communities"
        description="Edulure powers the modern learning OS for operators who obsess over outcomes. Blend courses, community, live sessions, and analytics into one brandable experience."
        cta={
          <>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
            >
              Start Free Trial
            </Link>
            <Link
              to="/instructor"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
            >
              Become an Instructor
            </Link>
          </>
        }
      />
      <StatsBar />
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Learner experience</p>
            <h2 className="mt-4 text-3xl font-semibold text-white lg:text-4xl">Showcase how clients move from discovery to daily engagement</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Recreate every touchpoint for prospective learners with high-fidelity previews of search, booking, dashboards, and
              community interactions. Each static interface mirrors the live product so prospects can imagine themselves inside
              the platform.
            </p>
          </div>
          <div className="mt-16 grid gap-10 lg:grid-cols-2">
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_80px_-40px_rgba(15,118,110,0.6)] backdrop-blur">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">Search</span>
                <h3 className="text-2xl font-semibold text-white">Precision search &amp; guided discovery</h3>
                <p className="text-sm leading-6 text-slate-300">
                  Showcase the learner-facing catalog with tags, filters, and instant results. Ideal for highlighting breadth of
                  experts and clear outcome-based descriptions.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>Rich profiles with credentials, focus areas, and pricing signals</li>
                  <li>Adaptive filters for goals, schedule, and delivery format</li>
                  <li>Trust badges, session previews, and testimonial snippets</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-inner">
                <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs text-slate-400">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold text-white">Search mentors</span>
                  <span className="opacity-70">marketing automation</span>
                </div>
                <div className="mt-6 space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-start gap-4 rounded-2xl bg-slate-800/80 p-4">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                        <div className="h-full w-full bg-gradient-to-br from-primary to-emerald-500" />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">{item}</div>
                      </div>
                      <div className="space-y-2 text-left">
                        <p className="text-sm font-semibold text-white">Growth Marketing Accelerator</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-400">
                          <span className="rounded-full bg-slate-900/70 px-2 py-1">5.0 ★</span>
                          <span className="rounded-full bg-slate-900/70 px-2 py-1">12-week sprint</span>
                          <span className="rounded-full bg-slate-900/70 px-2 py-1">$249/mo</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_80px_-40px_rgba(59,130,246,0.45)] backdrop-blur">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">Booking</span>
                <h3 className="text-2xl font-semibold text-white">High-conversion booking flows</h3>
                <p className="text-sm leading-6 text-slate-300">
                  Emphasize frictionless scheduling with transparent timelines. Each step clarifies commitment, expectations,
                  and payment before confirming.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>Step-by-step progress with session formats and add-ons</li>
                  <li>Calendar availability synced with the provider&apos;s timezone</li>
                  <li>Upsell membership options with value messaging</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-blue-400/30 bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-950 p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white">Checkout • Brand Strategy Intensive</span>
                  <span>Step 2 of 3</span>
                </div>
                <div className="mt-4 grid gap-4">
                  <div className="rounded-2xl border border-white/5 bg-slate-800/60 p-4">
                    <p className="text-sm font-semibold text-white">Choose your format</p>
                    <div className="mt-3 grid gap-3">
                      <div className="flex items-center justify-between rounded-xl border border-blue-400/40 bg-blue-500/10 px-3 py-3 text-xs">
                        <span className="font-semibold text-white">Live strategy workshop (90 min)</span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-blue-100">Most popular</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3 text-xs text-slate-300">
                        <span>Async review + recording</span>
                        <span className="text-white">$149</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Date</span>
                      <span className="text-white">Thu • Apr 18</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Time</span>
                      <span className="text-white">11:30 AM GMT</span>
                    </div>
                    <div className="mt-3 rounded-xl bg-blue-500/20 px-3 py-2 text-[11px] text-blue-100">Add a membership and save 20% on future bookings</div>
                  </div>
                  <button className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white">Continue to payment</button>
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_80px_-40px_rgba(236,72,153,0.45)] backdrop-blur">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-pink-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pink-200">Dashboard</span>
                <h3 className="text-2xl font-semibold text-white">Learner dashboard &amp; progress tracking</h3>
                <p className="text-sm leading-6 text-slate-300">
                  Demonstrate daily value with streaks, goal tracking, and personalized recommendations. Perfect for showing
                  accountability loops and the embedded curriculum.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>Completion insights paired with milestone celebrations</li>
                  <li>Integrated resources, replays, and cohort chat prompts</li>
                  <li>AI nudges that surface the next best action</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
                    <div>
                      <p className="text-sm font-semibold text-white">Hi, Taylor 👋</p>
                      <p className="text-xs text-slate-300">Momentum builder • Week 4</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-pink-100">Streak 12 days</span>
                </div>
                <div className="mt-6 grid gap-4">
                  <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-800/60 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Brand Sprint</span>
                      <span className="text-white">68% complete</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                      <span className="rounded-xl bg-slate-900/60 px-2 py-2 text-center text-white">Today&apos;s sprint</span>
                      <span className="rounded-xl bg-slate-900/40 px-2 py-2 text-center">Watch replay</span>
                      <span className="rounded-xl bg-slate-900/40 px-2 py-2 text-center">Submit update</span>
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300">
                    <p className="text-sm font-semibold text-white">Next action</p>
                    <p>Review your competitor positioning worksheet before Friday&apos;s workshop.</p>
                    <button className="self-start rounded-full bg-pink-500/20 px-3 py-1 text-[11px] text-pink-100">Mark as done</button>
                  </div>
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_80px_-40px_rgba(45,212,191,0.4)] backdrop-blur">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-200">Community</span>
                <h3 className="text-2xl font-semibold text-white">Live feed &amp; community rituals</h3>
                <p className="text-sm leading-6 text-slate-300">
                  Recreate the sense of momentum inside the feed—from quick wins to collaborative threads—to spotlight the energy
                  prospects can expect the moment they join.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>Program-wide announcements with rich media</li>
                  <li>Peer celebrations, requests for feedback, and progress spotlights</li>
                  <li>Moderation tools surfaced subtly for trust and safety</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500" />
                  <div>
                    <p className="text-sm font-semibold text-white">Momentum feed</p>
                    <p className="text-xs text-slate-400">Today • 18 active threads</p>
                  </div>
                </div>
                <div className="mt-6 space-y-4 text-left text-xs text-slate-300">
                  <div className="rounded-2xl border border-white/5 bg-slate-800/60 p-4">
                    <p className="text-sm font-semibold text-white">🎉 Launch win from Sara Patel</p>
                    <p className="mt-2">Closed 3 new retainers after refining her positioning with the cohort. Sharing the pitch deck inside!</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px]">
                      <span className="rounded-full bg-white/10 px-2 py-1 text-teal-100">52 reactions</span>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-teal-100">14 replies</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
                    <p className="text-sm font-semibold text-white">🧠 Question from Leo Park</p>
                    <p className="mt-2">Looking for feedback on my onboarding email. Drop templates in the thread?</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px]">
                      <span className="rounded-full bg-white/10 px-2 py-1 text-teal-100">5 mentors replied</span>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-teal-100">Save playbook</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Provider experience</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900 lg:text-4xl">Show operators the control center built for scale</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Mirror the provider console with modular static previews that feel like screenshots—without shipping binaries.
              Highlight revenue, ops, and content workflows that decision-makers care about.
            </p>
          </div>
          <div className="mt-16 grid gap-10 lg:grid-cols-2">
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-slate-200 bg-slate-50 p-8 shadow-[0_40px_80px_-40px_rgba(15,118,110,0.25)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">Pipeline</span>
                <h3 className="text-2xl font-semibold text-slate-900">Unified booking pipeline</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Show prospects how their team can triage inquiries, approvals, and upcoming sessions in one board view synced
                  with automations.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Lane-based pipeline across inquiry, confirmed, and completed</li>
                  <li>Revenue forecasting surfaced inline</li>
                  <li>Ownership tags to keep mentors accountable</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Booking pipeline</span>
                  <span>Week of Apr 15</span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {["New", "Confirmed", "Completed"].map((stage, index) => (
                    <div key={stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{stage}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{index + 3}</span>
                      </div>
                      <div className="mt-3 space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                          <p className="text-sm font-semibold text-slate-800">Brand Sprint</p>
                          <p>Client: LaunchLab</p>
                          <p className="text-primary">$2,400</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                          <p className="text-sm font-semibold text-slate-800">Executive Coaching</p>
                          <p>Client: BoldCo</p>
                          <p className="text-primary">$1,050</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-slate-200 bg-slate-50 p-8 shadow-[0_40px_80px_-40px_rgba(59,130,246,0.25)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-500">Content</span>
                <h3 className="text-2xl font-semibold text-slate-900">Program &amp; content studio</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Illustrate how teams assemble curriculum, assets, and automation in a single workspace tailored for hybrid
                  learning businesses.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Drag-and-drop modules with release schedules</li>
                  <li>Asset library with AI-generated outlines</li>
                  <li>Connected workflows for drip, live, and community touchpoints</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Build curriculum</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-500">Draft</span>
                </div>
                <div className="mt-5 grid gap-4">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Module 1 • Positioning Foundations</p>
                      <p>Released Apr 10 • 3 lessons</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-600">Published</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-dashed border-blue-200 p-4 text-xs text-slate-500">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Module 2 • Offer Architecture</p>
                      <p>Schedule release • Apr 17</p>
                    </div>
                    <button className="rounded-full bg-blue-500 px-3 py-1 text-[11px] font-semibold text-white">Add lesson</button>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    <p className="text-sm font-semibold text-slate-800">Assets</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['Workbook.pdf', 'Deck.key', 'AI summary'].map((asset) => (
                        <span key={asset} className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-500">{asset}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-slate-200 bg-slate-50 p-8 shadow-[0_40px_80px_-40px_rgba(236,72,153,0.25)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-pink-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pink-500">Revenue</span>
                <h3 className="text-2xl font-semibold text-slate-900">Financial intelligence dashboard</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Give operators confidence with ARR trajectories, membership health, and channel attribution—all rendered in a
                  static &ldquo;screenshot&rdquo; style module.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Real-time MRR with plan-level breakdowns</li>
                  <li>Cohort retention heat maps</li>
                  <li>Revenue-by-channel spotlight for growth sprints</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Revenue overview</span>
                  <span>Q2 • Updated 3m ago</span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">MRR growth</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">$142k</p>
                    <p className="text-xs text-slate-500">+18% vs last month</p>
                    <div className="mt-4 h-24 overflow-hidden rounded-xl bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200">
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.45),_transparent_55%)]" />
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                      <p className="text-sm font-semibold text-slate-800">Plan mix</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between"><span>Pro</span><span className="text-slate-900">46%</span></div>
                        <div className="flex items-center justify-between"><span>Growth</span><span className="text-slate-900">32%</span></div>
                        <div className="flex items-center justify-between"><span>Enterprise</span><span className="text-slate-900">22%</span></div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                      <p className="text-sm font-semibold text-slate-800">Top channels</p>
                      <div className="mt-3 space-y-2">
                        {[
                          { channel: 'Partner referrals', value: '41%' },
                          { channel: 'Organic content', value: '27%' },
                          { channel: 'Paid social', value: '18%' },
                        ].map(({ channel, value }) => (
                          <div key={channel} className="flex items-center justify-between">
                            <span>{channel}</span>
                            <span className="text-slate-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-slate-200 bg-slate-50 p-8 shadow-[0_40px_80px_-40px_rgba(45,212,191,0.25)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-500">Team</span>
                <h3 className="text-2xl font-semibold text-slate-900">Operations &amp; team management</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Highlight permissions, staffing, and quality controls so enterprises know they can delegate safely across
                  instructors and moderators.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Role-based access with contextual insights</li>
                  <li>Compliance reminders and risk indicators</li>
                  <li>Moderator productivity metrics at a glance</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Team directory</span>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-600">4 roles</span>
                </div>
                <div className="mt-5 space-y-3 text-xs text-slate-500">
                  {[
                    { name: 'Maya Chen', role: 'Lead Instructor', status: 'Live now', statusColor: 'bg-emerald-500/10 text-emerald-600' },
                    { name: 'Jordan Brooks', role: 'Community Manager', status: 'Moderating', statusColor: 'bg-blue-500/10 text-blue-600' },
                    { name: 'Ravi Patel', role: 'Ops Analyst', status: 'Reviewing QA', statusColor: 'bg-amber-500/10 text-amber-600' },
                    { name: 'Sofia Gomez', role: 'Mentor', status: 'Next session 2h', statusColor: 'bg-teal-500/10 text-teal-600' },
                  ].map(({ name, role, status, statusColor }) => (
                    <div key={name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{name}</p>
                          <p>{role}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusColor}`}>{status}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 text-[11px] text-slate-500">
                  <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                    <span>Automation status</span>
                    <span className="rounded-full bg-teal-500/10 px-2 py-1 text-teal-600">On</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                    <span>Compliance checklist</span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-600">2 reviews pending</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-slate-900">High-converting funnels, zero friction</h2>
            <p className="text-base leading-7 text-slate-600">
              Spin up multi-step onboarding experiences with integrated payments, upsells, and segmentation. Pair with growth
              experiments, A/B tests, and insights delivered directly to your team.
            </p>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                Dynamic funnels for cohorts, memberships, and evergreen programs.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                Optimize conversions with behavioral triggers and calendar-based offers.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                Integrate with your CRM, analytics, and marketing stack instantly.
              </li>
            </ul>
            <div className="flex gap-4 text-sm font-semibold">
              <a href="#demo" className="text-primary hover:text-primary-dark">
                View conversion playbooks →
              </a>
              <a href="#enterprise" className="text-slate-600 hover:text-primary">
                Explore enterprise controls
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-10 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-accent/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white/70 shadow-2xl backdrop-blur">
              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
                alt="Conversion dashboard"
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      <FeatureGrid />
      <Testimonials />
      <section className="bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Launch your next flagship experience in days</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Edulure orchestrates everything from funnels to community moderation to analytics. Focus on strategy while we
              automate the workflows.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/feed"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
              >
                Explore the Live Feed
              </Link>
              <a
                href="/admin"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
              >
                View Admin Console
              </a>
            </div>
          </div>
          <div className="rounded-4xl border border-slate-200 bg-white p-10 shadow-card">
            <h3 className="text-xl font-semibold text-slate-900">Enterprise-grade reliability</h3>
            <ul className="mt-6 space-y-4 text-sm text-slate-600">
              <li>SSO + SAML 2.0, SOC 2 Type II readiness</li>
              <li>Fine-grained permissions across instructors, moderators, and admins</li>
              <li>Global CDN, 99.9% uptime, disaster recovery playbooks</li>
            </ul>
            <p className="mt-8 text-sm font-semibold text-slate-500">We onboard your team in under 48 hours.</p>
          </div>
        </div>
      </section>
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold text-slate-900">Ready to power your learning ecosystem?</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Join Edulure and access the infrastructure trusted by premium education operators worldwide.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
            >
              Claim your workspace
            </Link>
            <a
              href="mailto:hello@edulure.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
