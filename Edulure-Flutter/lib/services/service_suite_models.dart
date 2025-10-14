class ServiceSuite {
  ServiceSuite({
    required this.summary,
    required this.workflow,
    required this.catalogue,
    required this.bookings,
    required this.alerts,
    required this.controls,
  });

  factory ServiceSuite.fromJson(Map<String, dynamic> json) {
    final summary = <ServiceSummaryMetric>[];
    if (json['summary'] is List) {
      for (final item in json['summary'] as List) {
        if (item is Map<String, dynamic>) {
          summary.add(ServiceSummaryMetric.fromJson(item));
        }
      }
    }

    final workflowJson = json['workflow'] is Map<String, dynamic>
        ? Map<String, dynamic>.from(json['workflow'] as Map)
        : <String, dynamic>{};
    final catalogue = <ServiceOffering>[];
    if (json['catalogue'] is List) {
      for (final item in json['catalogue'] as List) {
        if (item is Map<String, dynamic>) {
          catalogue.add(ServiceOffering.fromJson(item));
        }
      }
    }

    final bookingsJson = json['bookings'] is Map<String, dynamic>
        ? Map<String, dynamic>.from(json['bookings'] as Map)
        : <String, dynamic>{};

    final alerts = <ServiceAlert>[];
    if (json['alerts'] is List) {
      for (final item in json['alerts'] as List) {
        if (item is Map<String, dynamic>) {
          alerts.add(ServiceAlert.fromJson(item));
        }
      }
    }

    final controls = json['controls'] is Map<String, dynamic>
        ? ServiceControlDeck.fromJson(Map<String, dynamic>.from(json['controls'] as Map))
        : ServiceControlDeck.empty();

    return ServiceSuite(
      summary: summary,
      workflow: ServiceWorkflow.fromJson(workflowJson),
      catalogue: catalogue,
      bookings: ServiceBookingOverview.fromJson(bookingsJson),
      alerts: alerts,
      controls: controls,
    );
  }

  final List<ServiceSummaryMetric> summary;
  final ServiceWorkflow workflow;
  final List<ServiceOffering> catalogue;
  final ServiceBookingOverview bookings;
  final List<ServiceAlert> alerts;
  final ServiceControlDeck controls;
}

class ServiceSummaryMetric {
  ServiceSummaryMetric({
    required this.id,
    required this.label,
    required this.value,
    this.detail,
    this.tone,
  });

  factory ServiceSummaryMetric.fromJson(Map<String, dynamic> json) {
    return ServiceSummaryMetric(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      value: json['value']?.toString() ?? '',
      detail: json['detail']?.toString(),
      tone: json['tone']?.toString(),
    );
  }

  final String id;
  final String label;
  final String value;
  final String? detail;
  final String? tone;
}

class ServiceWorkflow {
  ServiceWorkflow({
    required this.owner,
    required this.automationRate,
    required this.breachCount,
    required this.stages,
    required this.notes,
  });

  factory ServiceWorkflow.fromJson(Map<String, dynamic> json) {
    final stages = <ServiceWorkflowStage>[];
    if (json['stages'] is List) {
      for (final item in json['stages'] as List) {
        if (item is Map<String, dynamic>) {
          stages.add(ServiceWorkflowStage.fromJson(item));
        }
      }
    }
    final notes = <String>[];
    if (json['notes'] is List) {
      for (final item in json['notes'] as List) {
        if (item is String) {
          notes.add(item);
        }
      }
    }
    return ServiceWorkflow(
      owner: json['owner']?.toString() ?? 'Service operations desk',
      automationRate: json['automationRate'] is num ? (json['automationRate'] as num).toDouble() : null,
      breachCount: json['breachCount'] is num ? (json['breachCount'] as num).toInt() : 0,
      stages: stages,
      notes: notes,
    );
  }

  final String owner;
  final double? automationRate;
  final int breachCount;
  final List<ServiceWorkflowStage> stages;
  final List<String> notes;
}

class ServiceWorkflowStage {
  ServiceWorkflowStage({
    required this.id,
    required this.title,
    required this.status,
    this.description,
    this.tone,
    required this.kpis,
  });

  factory ServiceWorkflowStage.fromJson(Map<String, dynamic> json) {
    final kpis = <String>[];
    if (json['kpis'] is List) {
      for (final item in json['kpis'] as List) {
        if (item is String) {
          kpis.add(item);
        }
      }
    }
    return ServiceWorkflowStage(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      description: json['description']?.toString(),
      tone: json['tone']?.toString(),
      kpis: kpis,
    );
  }

  final String id;
  final String title;
  final String status;
  final String? description;
  final String? tone;
  final List<String> kpis;
}

class ServiceOffering {
  ServiceOffering({
    required this.id,
    required this.name,
    required this.category,
    this.status,
    this.statusLabel,
    this.statusTone,
    this.description,
    this.priceLabel,
    this.durationLabel,
    this.deliveryLabel,
    required this.tags,
    this.csatLabel,
    this.clientsServedLabel,
    this.automationLabel,
    this.slaLabel,
    this.utilisationLabel,
  });

  factory ServiceOffering.fromJson(Map<String, dynamic> json) {
    final tags = <String>[];
    if (json['tags'] is List) {
      for (final item in json['tags'] as List) {
        if (item is String) {
          tags.add(item);
        }
      }
    }
    return ServiceOffering(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      status: json['status']?.toString(),
      statusLabel: json['statusLabel']?.toString(),
      statusTone: json['statusTone']?.toString(),
      description: json['description']?.toString(),
      priceLabel: json['priceLabel']?.toString(),
      durationLabel: json['durationLabel']?.toString(),
      deliveryLabel: json['deliveryLabel']?.toString(),
      tags: tags,
      csatLabel: json['csatLabel']?.toString(),
      clientsServedLabel: json['clientsServedLabel']?.toString(),
      automationLabel: json['automationLabel']?.toString(),
      slaLabel: json['slaLabel']?.toString(),
      utilisationLabel: json['utilisationLabel']?.toString(),
    );
  }

  final String id;
  final String name;
  final String category;
  final String? status;
  final String? statusLabel;
  final String? statusTone;
  final String? description;
  final String? priceLabel;
  final String? durationLabel;
  final String? deliveryLabel;
  final List<String> tags;
  final String? csatLabel;
  final String? clientsServedLabel;
  final String? automationLabel;
  final String? slaLabel;
  final String? utilisationLabel;
}

class ServiceBookingOverview {
  ServiceBookingOverview({
    required this.upcoming,
    required this.months,
    required this.calendar,
  });

  factory ServiceBookingOverview.fromJson(Map<String, dynamic> json) {
    final upcoming = <ServiceBookingEvent>[];
    if (json['upcoming'] is List) {
      for (final item in json['upcoming'] as List) {
        if (item is Map<String, dynamic>) {
          upcoming.add(ServiceBookingEvent.fromJson(item));
        }
      }
    }

    final months = <ServiceBookingMonth>[];
    if (json['monthly'] is List) {
      for (final item in json['monthly'] as List) {
        if (item is Map<String, dynamic>) {
          months.add(ServiceBookingMonth.fromJson(item));
        }
      }
    }

    final calendar = <ServiceCalendarMonth>[];
    if (json['calendar'] is List) {
      for (final item in json['calendar'] as List) {
        if (item is Map<String, dynamic>) {
          calendar.add(ServiceCalendarMonth.fromJson(item));
        }
      }
    }

    return ServiceBookingOverview(
      upcoming: upcoming,
      months: months,
      calendar: calendar,
    );
  }

  final List<ServiceBookingEvent> upcoming;
  final List<ServiceBookingMonth> months;
  final List<ServiceCalendarMonth> calendar;
}

class ServiceBookingMonth {
  ServiceBookingMonth({
    required this.id,
    required this.label,
    required this.confirmed,
    required this.pending,
    required this.capacity,
    this.utilisationRate,
    this.note,
  });

  factory ServiceBookingMonth.fromJson(Map<String, dynamic> json) {
    return ServiceBookingMonth(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      confirmed: json['confirmed'] is num ? (json['confirmed'] as num).toInt() : 0,
      pending: json['pending'] is num ? (json['pending'] as num).toInt() : 0,
      capacity: json['capacity'] is num ? (json['capacity'] as num).toInt() : 0,
      utilisationRate: json['utilisationRate'] is num ? (json['utilisationRate'] as num).toInt() : null,
      note: json['note']?.toString(),
    );
  }

  final String id;
  final String label;
  final int confirmed;
  final int pending;
  final int capacity;
  final int? utilisationRate;
  final String? note;
}

class ServiceBookingEvent {
  ServiceBookingEvent({
    required this.id,
    required this.label,
    required this.status,
    required this.statusLabel,
    required this.learner,
    required this.scheduledFor,
    this.stage,
    this.timeLabel,
  });

  factory ServiceBookingEvent.fromJson(Map<String, dynamic> json) {
    return ServiceBookingEvent(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      statusLabel: json['statusLabel']?.toString() ?? json['status']?.toString() ?? '',
      learner: json['learner']?.toString() ?? '',
      scheduledFor: json['scheduledFor']?.toString() ?? '',
      stage: json['stage']?.toString(),
      timeLabel: json['timeLabel']?.toString(),
    );
  }

  final String id;
  final String label;
  final String status;
  final String statusLabel;
  final String learner;
  final String scheduledFor;
  final String? stage;
  final String? timeLabel;
}

class ServiceCalendarMonth {
  ServiceCalendarMonth({
    required this.id,
    required this.label,
    required this.year,
    required this.month,
    required this.confirmed,
    required this.pending,
    required this.capacity,
    this.utilisationRate,
    required this.weeks,
  });

  factory ServiceCalendarMonth.fromJson(Map<String, dynamic> json) {
    final weeks = <ServiceCalendarWeek>[];
    if (json['weeks'] is List) {
      for (final item in json['weeks'] as List) {
        if (item is Map<String, dynamic>) {
          weeks.add(ServiceCalendarWeek.fromJson(item));
        }
      }
    }
    return ServiceCalendarMonth(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      year: json['year'] is num ? (json['year'] as num).toInt() : DateTime.now().year,
      month: json['month'] is num ? (json['month'] as num).toInt() : DateTime.now().month,
      confirmed: json['confirmed'] is num ? (json['confirmed'] as num).toInt() : 0,
      pending: json['pending'] is num ? (json['pending'] as num).toInt() : 0,
      capacity: json['capacity'] is num ? (json['capacity'] as num).toInt() : 0,
      utilisationRate: json['utilisationRate'] is num ? (json['utilisationRate'] as num).toInt() : null,
      weeks: weeks,
    );
  }

  final String id;
  final String label;
  final int year;
  final int month;
  final int confirmed;
  final int pending;
  final int capacity;
  final int? utilisationRate;
  final List<ServiceCalendarWeek> weeks;

  List<ServiceCalendarDay> get days =>
      weeks.expand((week) => week.days).toList(growable: false);
}

class ServiceCalendarWeek {
  ServiceCalendarWeek({
    required this.id,
    required this.days,
  });

  factory ServiceCalendarWeek.fromJson(Map<String, dynamic> json) {
    final days = <ServiceCalendarDay>[];
    if (json['days'] is List) {
      for (final item in json['days'] as List) {
        if (item is Map<String, dynamic>) {
          days.add(ServiceCalendarDay.fromJson(item));
        }
      }
    }
    return ServiceCalendarWeek(
      id: json['id']?.toString() ?? '',
      days: days,
    );
  }

  final String id;
  final List<ServiceCalendarDay> days;
}

class ServiceCalendarDay {
  ServiceCalendarDay({
    required this.id,
    required this.date,
    required this.day,
    required this.isCurrentMonth,
    required this.bookings,
  });

  factory ServiceCalendarDay.fromJson(Map<String, dynamic> json) {
    final bookings = <ServiceCalendarBooking>[];
    if (json['bookings'] is List) {
      for (final item in json['bookings'] as List) {
        if (item is Map<String, dynamic>) {
          bookings.add(ServiceCalendarBooking.fromJson(item));
        }
      }
    }
    return ServiceCalendarDay(
      id: json['id']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      day: json['day'] is num ? (json['day'] as num).toInt() : 0,
      isCurrentMonth: json['isCurrentMonth'] == true,
      bookings: bookings,
    );
  }

  final String id;
  final String date;
  final int day;
  final bool isCurrentMonth;
  final List<ServiceCalendarBooking> bookings;
}

class ServiceCalendarBooking {
  ServiceCalendarBooking({
    required this.id,
    required this.label,
    required this.status,
    this.timeLabel,
    this.learner,
  });

  factory ServiceCalendarBooking.fromJson(Map<String, dynamic> json) {
    return ServiceCalendarBooking(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      timeLabel: json['timeLabel']?.toString(),
      learner: json['learner']?.toString(),
    );
  }

  final String id;
  final String label;
  final String status;
  final String? timeLabel;
  final String? learner;
}

class ServiceAlert {
  ServiceAlert({
    required this.id,
    required this.severity,
    required this.title,
    this.detail,
  });

  factory ServiceAlert.fromJson(Map<String, dynamic> json) {
    return ServiceAlert(
      id: json['id']?.toString() ?? '',
      severity: json['severity']?.toString() ?? 'info',
      title: json['title']?.toString() ?? '',
      detail: json['detail']?.toString(),
    );
  }

  final String id;
  final String severity;
  final String title;
  final String? detail;
}

class ServiceControlDeck {
  ServiceControlDeck({
    required this.owner,
    this.lastAudit,
    this.restrictedRoles,
    this.encryption,
    this.automationRate,
    this.retentionDays,
    this.monitoring,
    this.policies,
    this.auditLog,
  });

  factory ServiceControlDeck.empty() {
    return ServiceControlDeck(owner: 'Service operations desk');
  }

  factory ServiceControlDeck.fromJson(Map<String, dynamic> json) {
    final policies = <String>[];
    if (json['policies'] is List) {
      for (final item in json['policies'] as List) {
        if (item is String) {
          policies.add(item);
        }
      }
    }
    final restrictedRoles = <String>[];
    if (json['restrictedRoles'] is List) {
      for (final item in json['restrictedRoles'] as List) {
        if (item is String) {
          restrictedRoles.add(item);
        }
      }
    }
    return ServiceControlDeck(
      owner: json['owner']?.toString() ?? 'Service operations desk',
      lastAudit: json['lastAudit']?.toString(),
      restrictedRoles: restrictedRoles,
      encryption: json['encryption']?.toString(),
      automationRate: json['automationRate'] is num ? (json['automationRate'] as num).toDouble() : null,
      retentionDays: json['retentionDays'] is num ? (json['retentionDays'] as num).toInt() : null,
      monitoring: json['monitoring']?.toString(),
      policies: policies,
      auditLog: json['auditLog']?.toString(),
    );
  }

  final String owner;
  final String? lastAudit;
  final List<String>? restrictedRoles;
  final String? encryption;
  final double? automationRate;
  final int? retentionDays;
  final String? monitoring;
  final List<String>? policies;
  final String? auditLog;
}
