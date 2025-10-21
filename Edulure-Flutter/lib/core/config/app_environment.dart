enum AppEnvironment {
  development,
  staging,
  production,
  test,
}

AppEnvironment parseEnvironment(String value) {
  switch (value.toLowerCase()) {
    case 'production':
    case 'prod':
      return AppEnvironment.production;
    case 'staging':
      return AppEnvironment.staging;
    case 'test':
    case 'testing':
      return AppEnvironment.test;
    default:
      return AppEnvironment.development;
  }
}

extension AppEnvironmentX on AppEnvironment {
  String get displayLabel {
    switch (this) {
      case AppEnvironment.development:
        return 'Development';
      case AppEnvironment.staging:
        return 'Staging';
      case AppEnvironment.production:
        return 'Production';
      case AppEnvironment.test:
        return 'Test';
    }
  }

  bool get isLive => this == AppEnvironment.production || this == AppEnvironment.staging;
}
