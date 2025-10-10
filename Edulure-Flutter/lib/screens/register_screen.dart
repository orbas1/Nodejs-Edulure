import 'package:flutter/material.dart';

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create workspace')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: const [
                    _TextField(label: 'Full name'),
                    _TextField(label: 'Email address'),
                    _TextField(label: 'Company'),
                    _TextField(label: 'Role'),
                  ],
                ),
                const SizedBox(height: 16),
                const _TextField(label: 'Address'),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: const [
                    _TextField(label: 'Age'),
                    _TextField(label: 'Intent of use'),
                  ],
                ),
                const SizedBox(height: 16),
                const _TextField(label: 'Password', obscureText: true),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () {},
                  child: const Text('Launch workspace'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TextField extends StatelessWidget {
  const _TextField({required this.label, this.obscureText = false});

  final String label;
  final bool obscureText;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 260,
      child: TextField(
        obscureText: obscureText,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }
}
