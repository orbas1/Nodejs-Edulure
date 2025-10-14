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
