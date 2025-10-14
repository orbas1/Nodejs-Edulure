import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import Testimonials from '../components/Testimonials.jsx';

export default function Home() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <PageHero
        title="Build together. Launch faster."
        description="Edulure unites live lessons, community spaces, and revenue tools so your team can scale without the clutter."
        cta={
          <>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
            >
              Join the community
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:border-white hover:bg-white/10"
            >
              Peek inside live circles
            </Link>
          </>
        }
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-violet-50 to-sky-100/40">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[180px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Community heartbeat</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900 lg:text-4xl">Keep your operators, mentors, and learners in sync</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Search, gather, and stay accountable without juggling tools. Edulure keeps collaboration, communication, and follow-through in one secure place.
            </p>
          </div>
          <div className="mt-16 grid gap-10 lg:grid-cols-2">
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-slate-200 bg-white p-8 shadow-[0_45px_90px_-50px_rgba(99,102,241,0.4)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">Discovery</span>
                <h3 className="text-2xl font-semibold text-slate-900">Find circles without the guesswork</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Use precision filters to spot the right collaborators in seconds and join rooms that are already moving.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Profiles surface focus areas, availability, and current priorities</li>
                  <li>Filters lock to goals, time zones, and collaboration styles</li>
                  <li>Session notes and clips preview the energy before you join</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-inner">
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-900">Search circles</span>
                  <span className="opacity-70">brand storytelling</span>
                </div>
                <div className="mt-6 space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                        <div className="h-full w-full bg-gradient-to-br from-primary to-emerald-500" />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">{item}</div>
                      </div>
                      <div className="space-y-2 text-left">
                        <p className="text-sm font-semibold text-slate-900">Story-Driven Launch Lab</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Weekly jam</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Creative tech</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Mentor: Priya</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-blue-100 bg-white p-8 shadow-[0_45px_90px_-50px_rgba(59,130,246,0.45)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600">Gatherings</span>
                <h3 className="text-2xl font-semibold text-slate-900">Run sessions with clarity</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Handle signups, reminders, and follow-ups in one flow so every meeting feels intentional.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Pre-built formats cover co-working, hot seats, and workshops</li>
                  <li>Scheduling handles time zones, reminders, and secure entry links</li>
                  <li>Recordings and recaps publish automatically for anyone who couldn&apos;t make it live</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Circle RSVP • Brand Storytelling Jam</span>
                  <span>Step 2 of 3</span>
                </div>
                <div className="mt-4 grid gap-4">
                  <div className="rounded-2xl border border-blue-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Choose how you&apos;ll join</p>
                    <div className="mt-3 grid gap-3">
                      <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-xs">
                        <span className="font-semibold text-blue-700">Live co-creation room (75 min)</span>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] text-blue-700">Most loved</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-blue-100 px-3 py-3 text-xs text-slate-500">
                        <span>Async reflection thread</span>
                        <span className="text-slate-900">Included</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-white p-4 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Date</span>
                      <span className="text-slate-900">Thu • Apr 18</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Time</span>
                      <span className="text-slate-900">11:30 AM GMT</span>
                    </div>
                    <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-[11px] text-blue-700">Share a quick update so the room is ready.</div>
                  </div>
                  <button className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/40">Confirm your spot</button>
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-pink-100 bg-white p-8 shadow-[0_45px_90px_-50px_rgba(236,72,153,0.45)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pink-600">Rhythms</span>
                <h3 className="text-2xl font-semibold text-slate-900">Keep rituals moving</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Progress tracking, prompts, and shout-outs keep every cohort energized without extra admin.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Celebrate milestones with lightweight badges and notes</li>
                  <li>Surface resources, replays, and shared wins automatically</li>
                  <li>Smart nudges spotlight the next best action for each member</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-white p-6 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Hi, Taylor 👋</p>
                      <p className="text-xs text-slate-500">Momentum builder • Week 4</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-pink-100 px-3 py-1 text-[11px] text-pink-700">Streak 12 days</span>
                </div>
                <div className="mt-6 grid gap-4">
                  <div className="grid gap-3 rounded-2xl border border-pink-100 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Brand Sprint</span>
                      <span className="text-slate-900">68% complete</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-pink-100">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                      <span className="rounded-xl bg-pink-100 px-2 py-2 text-center text-pink-700">Today&apos;s sprint</span>
                      <span className="rounded-xl bg-slate-100 px-2 py-2 text-center">Watch replay</span>
                      <span className="rounded-xl bg-slate-100 px-2 py-2 text-center">Submit update</span>
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-2xl border border-pink-100 bg-white p-4 text-xs text-slate-500">
                    <p className="text-sm font-semibold text-slate-900">Next ritual</p>
                    <p>Post a takeaway before Friday&apos;s jam to keep momentum high.</p>
                    <button className="self-start rounded-full bg-pink-100 px-3 py-1 text-[11px] text-pink-700">Share update</button>
                  </div>
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-teal-100 bg-white p-8 shadow-[0_45px_90px_-50px_rgba(45,212,191,0.4)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-600">Community</span>
                <h3 className="text-2xl font-semibold text-slate-900">A feed designed for action</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Wins, asks, and resources live together so every check-in sparks the next move.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Announcements highlight launches, updates, and templates</li>
                  <li>Members celebrate wins, request feedback, and swap resources</li>
                  <li>Smart moderation keeps focus without slowing the energy</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-white p-6 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Momentum feed</p>
                    <p className="text-xs text-slate-500">Today • 18 active threads</p>
                  </div>
                </div>
                <div className="mt-6 space-y-4 text-left text-xs text-slate-500">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Launch win from Sara Patel</p>
                    <p className="mt-2">Booked three dream clients after a circle hot seat. Dropping the template deck for anyone to remix.</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">52 reactions</span>
                      <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">14 replies</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">🧠 Question from Leo Park</p>
                    <p className="mt-2">Looking for feedback on my onboarding email. Drop examples or voice notes in the thread?</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">5 mentors replied</span>
                      <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">Save playbook</span>
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
            <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Guide toolkit</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900 lg:text-4xl">Give mentors and hosts everything they need to nurture the community</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              From coordinating circles to sharing resources and listening to member sentiment, the backstage tools keep the human touch intact while lightening the operational lift.
            </p>
          </div>
          <div className="mt-16 grid gap-10 lg:grid-cols-2">
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-slate-200 bg-slate-50 p-8 shadow-[0_40px_80px_-40px_rgba(15,118,110,0.25)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">Circle planning</span>
                <h3 className="text-2xl font-semibold text-slate-900">Coordinate sessions with clarity</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Hosts can see every circle at a glance—who&apos;s queued up, who needs a check-in, and which rituals are about to go live.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Columns mirror your flow: gathering interest, prepping, live, and celebrating</li>
                  <li>Notes and reminders live next to each session so context never gets lost</li>
                  <li>Ownership tags make it easy to tap co-hosts or bring in mentors</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Circle run sheet</span>
                  <span>Week of Apr 15</span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {["Gathering", "In session", "Wins"].map((stage, index) => (
                    <div key={stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{stage}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{index + 3}</span>
                      </div>
                      <div className="mt-3 space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                          <p className="text-sm font-semibold text-slate-800">Story Circle • Tuesday</p>
                          <p>Host: Priya N.</p>
                          <p className="text-primary">Theme: Narrative funnels</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                          <p className="text-sm font-semibold text-slate-800">Deep Work Cowork</p>
                          <p>Host: Leo P.</p>
                          <p className="text-primary">Prep: Share focus goals</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-slate-200 bg-slate-50 p-8 shadow-[0_40px_80px_-40px_rgba(59,130,246,0.25)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-500">Resource studio</span>
                <h3 className="text-2xl font-semibold text-slate-900">Build shared libraries that spark action</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Hosts drop recaps, playbooks, and audio reflections into one living workspace so members can keep learning between sessions.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Organize by circle, theme, or cohort with release windows and permissions</li>
                  <li>Attach canvases, transcripts, and async videos without juggling drives</li>
                  <li>Pin top resources into the feed so big wins stay discoverable</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Shared resource hub</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-500">New drops</span>
                </div>
                <div className="mt-5 grid gap-4">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Playbook • Story sprint checklist</p>
                      <p>Shared Apr 10 • Circle: Launch Lab</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-600">Pinned</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-dashed border-blue-200 p-4 text-xs text-slate-500">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Audio recap • Brand story AMA</p>
                      <p>Schedule publish • Apr 17</p>
                    </div>
                    <button className="rounded-full bg-blue-500 px-3 py-1 text-[11px] font-semibold text-white">Upload file</button>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    <p className="text-sm font-semibold text-slate-800">Most saved resources</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['Circle guide', 'Voice memo', 'Miro canvas'].map((asset) => (
                        <span key={asset} className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-500">{asset}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-8 rounded-4xl border border-slate-200 bg-slate-50 p-8 shadow-[0_40px_80px_-40px_rgba(236,72,153,0.25)]">
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-pink-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pink-500">Pulse</span>
                <h3 className="text-2xl font-semibold text-slate-900">Listen to the community&apos;s energy</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Track connection, contributions, and wellbeing without turning people into cold numbers. Everything points to how members feel and where to focus support.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Quickly spot circles that are thriving or need a fresh prompt</li>
                  <li>Celebrate top contributors with gratitude nudges and badges</li>
                  <li>Surface member feedback themes to inspire new experiences</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Community pulse</span>
                  <span>Updated 3m ago</span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">Circle vitality</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">87%</p>
                    <p className="text-xs text-slate-500">Members reporting they feel supported this week</p>
                    <div className="mt-4 h-24 overflow-hidden rounded-xl bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200">
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.45),_transparent_55%)]" />
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                      <p className="text-sm font-semibold text-slate-800">Moments to celebrate</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between"><span>Shared wins</span><span className="text-slate-900">34</span></div>
                        <div className="flex items-center justify-between"><span>Peer shout-outs</span><span className="text-slate-900">58</span></div>
                        <div className="flex items-center justify-between"><span>New collaborations</span><span className="text-slate-900">21</span></div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                      <p className="text-sm font-semibold text-slate-800">Feedback themes</p>
                      <div className="mt-3 space-y-2">
                        {[
                          { channel: 'Looking for accountability', value: '22 mentions' },
                          { channel: 'Need async options', value: '16 mentions' },
                          { channel: 'Requesting partner intros', value: '9 mentions' },
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
                <span className="inline-flex items-center rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-500">Stewards</span>
                <h3 className="text-2xl font-semibold text-slate-900">Know who&apos;s holding space</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Quickly see which mentors are live, who&apos;s on support duty, and where an extra host might be helpful.
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>Role cards highlight responsibilities and current focus</li>
                  <li>Check moderation health and member support load at a glance</li>
                  <li>Spin up gentle automations without losing the personal touch</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Community stewards</span>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-600">4 active</span>
                </div>
                <div className="mt-5 space-y-3 text-xs text-slate-500">
                  {[
                    { name: 'Maya Chen', role: 'Circle host', status: 'Live circle', statusColor: 'bg-emerald-500/10 text-emerald-600' },
                    { name: 'Jordan Brooks', role: 'Community guide', status: 'Holding office hours', statusColor: 'bg-blue-500/10 text-blue-600' },
                    { name: 'Ravi Patel', role: 'Member success', status: 'Checking in on new joins', statusColor: 'bg-amber-500/10 text-amber-600' },
                    { name: 'Sofia Gomez', role: 'Mentor', status: 'Next huddle in 2h', statusColor: 'bg-teal-500/10 text-teal-600' },
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
                    <span>Check-in queue</span>
                    <span className="rounded-full bg-teal-500/10 px-2 py-1 text-teal-600">5 members</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                    <span>Community agreements refresh</span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-600">Due Friday</span>
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
            <h2 className="text-3xl font-semibold text-slate-900">Craft welcoming journeys for every member</h2>
            <p className="text-base leading-7 text-slate-600">
              Mix live orientations, async prompts, and personal check-ins so newcomers feel at home from day one. Automations stay gentle—nudging, never nagging.
            </p>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                Customize onboarding flows for cohorts, memberships, or drop-in circles.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                Send timely nudges with conversation starters and reflection prompts tailored to progress.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                Invite members to choose their learning path—whether they prefer live jams or async deep dives.
              </li>
            </ul>
            <div className="flex gap-4 text-sm font-semibold">
              <a href="#demo" className="text-primary hover:text-primary-dark">
                Download the onboarding kit →
              </a>
              <a href="#community-care" className="text-slate-600 hover:text-primary">
                See member care automations
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-10 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-accent/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white/70 shadow-2xl backdrop-blur">
              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
                alt="Community orientation workshop"
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
            <h2 className="text-3xl font-semibold text-slate-900">Launch your next community ritual in days</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              We help you storyboard the experience, invite the right members, and capture the magic. You focus on connection—Edulure keeps everything humming in the background.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
              >
                Join the welcome circle
              </Link>
              <Link
                to="/feed"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
              >
                Peek at the live feed
              </Link>
            </div>
          </div>
          <div className="rounded-4xl border border-slate-200 bg-white p-10 shadow-card">
            <h3 className="text-xl font-semibold text-slate-900">What members feel on day one</h3>
            <ul className="mt-6 space-y-4 text-sm text-slate-600">
              <li>Warm intros that pair you with a buddy and a first circle</li>
              <li>Session replays, notes, and resources delivered automatically</li>
              <li>Community care team ready with weekly check-ins and celebrations</li>
            </ul>
            <p className="mt-8 text-sm font-semibold text-slate-500">We set everything up with you in under 48 hours.</p>
          </div>
        </div>
      </section>
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold text-slate-900">Ready to grow alongside people who get it?</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Step into a community of builders, mentors, and lifelong learners swapping playbooks and cheering each other on.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
            >
              Join Edulure
            </Link>
            <a
              href="mailto:hello@edulure.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
            >
              Chat with the team
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
