import 'package:edulure_mobile/core/config/app_config.dart';
import 'package:edulure_mobile/core/config/app_environment.dart';
import 'package:edulure_mobile/services/auth_client_metadata.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:package_info_plus/package_info_plus.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AuthClientMetadataResolver', () {
    test('collects package and environment metadata while caching results', () async {
      var loadCount = 0;
      final resolver = AuthClientMetadataResolver(
        config: AppConfig(
          environment: AppEnvironment.staging,
          apiBaseUrl: 'https://api.example.com/',
          enableNetworkLogging: false,
          sentryDsn: null,
          tracesSampleRate: 0.2,
        ),
        packageInfoLoader: () async {
          loadCount += 1;
          return PackageInfo(
            appName: 'Edulure Test',
            packageName: 'com.edulure.test',
            version: '1.5.0',
            buildNumber: '58',
            buildSignature: '',
          );
        },
      );

      final first = await resolver.resolve();
      expect(first['platform'], isNotEmpty);
      expect(first['appVersion'], '1.5.0');
      expect(first['buildNumber'], '58');
      expect(first['packageName'], 'com.edulure.test');
      expect(first['environment'], 'staging');
      expect(first['releaseChannel'], 'pre-release');
      expect(loadCount, 1);

      first['platform'] = 'mutated';

      final second = await resolver.resolve();
      expect(second['platform'], isNot('mutated'));
      expect(second['appVersion'], '1.5.0');
      expect(loadCount, 1);

      final third = await resolver.resolve();
      expect(third, isNot(same(second)));
      expect(loadCount, 1);
    });
  });
}
