import 'package:edulure_mobile/services/course_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('CourseDashboard parses instructor analytics and live classrooms', () {
    final dashboard = CourseDashboard.fromJson({
      'metrics': [
        {'label': 'Learners', 'value': '320'},
      ],
      'analytics': {
        'revenueStreams': [
          {'name': 'Courses', 'percent': 72}
        ],
      },
      'courses': {
        'pipeline': [
          {
            'id': 'pipeline-1',
            'name': 'AI Foundations',
            'stage': 'Enrollment',
            'startDate': 'May 1',
            'learners': '24'
          }
        ],
        'production': [
          {
            'id': 'task-1',
            'asset': 'Module outline',
            'owner': 'Curriculum Ops',
            'status': 'In review',
            'type': 'Curriculum'
          }
        ],
      },
      'pricing': {
        'offers': [
          {
            'id': 'offer-1',
            'name': 'Launch cohort',
            'price': '$499',
            'status': 'Active',
            'conversion': '12%',
            'learners': '18'
          }
        ],
        'sessions': [
          {
            'id': 'session-1',
            'name': 'Live lab',
            'date': 'June 12',
            'price': 'Included',
            'status': 'Scheduled',
            'seats': '30'
          }
        ],
        'insights': ['Run an early bird promotion'],
      },
      'ads': {
        'summary': {
          'activeCampaigns': 2,
          'totalSpend': {'formatted': '$1,200'},
          'averageCtr': '3.2%',
          'averageCpc': '$1.12',
          'averageCpa': '$18.30',
          'roas': '4.1x',
          'totalImpressions': 12000,
          'totalClicks': 340,
          'totalConversions': 24,
          'lastSyncedAt': '2024-05-10T10:00:00Z',
        },
        'active': [],
        'placements': [],
        'experiments': [],
        'targeting': {
          'keywords': [],
          'audiences': [],
          'locations': [],
          'languages': [],
          'summary': '',
        },
        'tags': [],
      },
      'liveClassrooms': {
        'metrics': [
          {'label': 'Live sessions', 'value': '3'},
        ],
        'active': [
          {
            'id': 'session-live',
            'title': 'Strategy Lab',
            'stage': 'In session',
            'status': 'live',
            'startLabel': 'Live now',
            'timezone': 'UTC',
            'occupancy': {'reserved': 12, 'capacity': 20},
            'security': {'waitingRoom': true, 'passcodeRequired': false, 'recordingConsent': true},
            'isGroupSession': true,
            'breakoutRooms': [
              {'name': 'Room A'},
              {'name': 'Room B'},
            ],
          }
        ],
        'upcoming': [],
        'completed': [],
        'groups': [],
        'whiteboard': {
          'snapshots': [
            {
              'id': 'board-1',
              'title': 'Sprint canvas',
              'template': 'Canvas',
              'ready': true,
              'facilitators': ['Jordan']
            }
          ],
          'readiness': [
            {'id': 'check-1', 'label': 'Slides uploaded', 'status': 'ready', 'detail': 'All assets synced'}
          ],
        },
      },
    });

    expect(dashboard.metrics.single.label, 'Learners');
    expect(dashboard.revenueMix.single.percent, closeTo(72, 0.001));
    expect(dashboard.pipeline.single.stage, 'Enrollment');
    expect(dashboard.production.single.asset, 'Module outline');
    expect(dashboard.offers.single.name, 'Launch cohort');
    expect(dashboard.sessions.single.status, 'Scheduled');
    expect(dashboard.insights, contains('Run an early bird promotion'));
    expect(dashboard.ads, isNotNull);
    expect(dashboard.liveClassrooms, isNotNull);
    expect(dashboard.liveClassrooms!.active.single.breakoutRooms.length, 2);
    expect(dashboard.hasSignals, isTrue);
  });
}
