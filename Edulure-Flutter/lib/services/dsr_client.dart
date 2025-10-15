import 'dart:async';

class DsrClient {
  const DsrClient();

  Future<void> submitRequest({required String type, required String description}) async {
    await Future.delayed(const Duration(milliseconds: 600));
    // In production this would call the compliance API. Here we simply emulate success.
  }
}
