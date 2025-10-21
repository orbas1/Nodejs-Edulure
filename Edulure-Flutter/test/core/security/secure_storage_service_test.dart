import 'package:edulure_mobile/core/security/secure_storage_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mocktail/mocktail.dart';

class _MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  group('SecureStorageService', () {
    late _MockFlutterSecureStorage storage;
    late SecureStorageService service;

    setUp(() {
      storage = _MockFlutterSecureStorage();
      service = SecureStorageService.custom(
        storage: storage,
        keyPrefix: 'ns.',
      );
    });

    test('write stores values with the configured namespace', () async {
      when(() => storage.write(key: any(named: 'key'), value: any(named: 'value')))
          .thenAnswer((_) async {});

      await service.write(key: 'token', value: 'abc');

      verify(() => storage.write(key: 'ns.token', value: 'abc')).called(1);
      verifyNoMoreInteractions(storage);
    });

    test('read retrieves a value using the namespace', () async {
      when(() => storage.read(key: any(named: 'key'))).thenAnswer((_) async => 'value');

      final result = await service.read(key: 'token');

      expect(result, 'value');
      verify(() => storage.read(key: 'ns.token')).called(1);
      verifyNoMoreInteractions(storage);
    });

    test('containsKey queries the underlying secure storage', () async {
      when(() => storage.containsKey(key: any(named: 'key'))).thenAnswer((_) async => true);

      final exists = await service.containsKey(key: 'token');

      expect(exists, isTrue);
      verify(() => storage.containsKey(key: 'ns.token')).called(1);
      verifyNoMoreInteractions(storage);
    });

    test('delete removes a specific entry', () async {
      when(() => storage.delete(key: any(named: 'key'))).thenAnswer((_) async {});

      await service.delete(key: 'token');

      verify(() => storage.delete(key: 'ns.token')).called(1);
      verifyNoMoreInteractions(storage);
    });

    test('deleteAll removes only the provided unique keys', () async {
      when(() => storage.delete(key: any(named: 'key'))).thenAnswer((_) async {});

      await service.deleteAll(keys: const ['one', 'two', 'one']);

      verifyInOrder([
        () => storage.delete(key: 'ns.one'),
        () => storage.delete(key: 'ns.two'),
      ]);
      verifyNoMoreInteractions(storage);
    });

    test('deleteAll without keys removes only entries in the namespace', () async {
      when(() => storage.readAll()).thenAnswer((_) async => {
            'ns.token': 'abc',
            'other.value': '123',
          });
      when(() => storage.delete(key: any(named: 'key'))).thenAnswer((_) async {});

      await service.deleteAll();

      verify(() => storage.readAll()).called(1);
      verify(() => storage.delete(key: 'ns.token')).called(1);
      verifyNever(() => storage.delete(key: 'other.value'));
      verifyNoMoreInteractions(storage);
    });

    test('deleteAll with keys ignores blanks', () async {
      when(() => storage.delete(key: any(named: 'key'))).thenAnswer((_) async {});

      await service.deleteAll(keys: const ['', '  ', 'token']);

      verify(() => storage.delete(key: 'ns.token')).called(1);
      verifyNoMoreInteractions(storage);
    });

    test('throws ArgumentError when key is blank', () {
      expect(() => service.write(key: '  ', value: 'value'), throwsArgumentError);
      verifyZeroInteractions(storage);
    });

    test('wraps failures in a SecureStorageException', () async {
      when(() => storage.write(key: any(named: 'key'), value: any(named: 'value')))
          .thenThrow(Exception('failure'));

      expect(
        service.write(key: 'token', value: 'abc'),
        throwsA(
          isA<SecureStorageException>()
              .having((exception) => exception.action, 'action', 'write(ns.token)')
              .having((exception) => exception.cause, 'cause', isA<Exception>()),
        ),
      );
    });
  });
}
