import 'package:flutter/material.dart';

import '../services/course_service.dart';
import '../services/session_manager.dart';

class CoursePurchaseScreen extends StatefulWidget {
  const CoursePurchaseScreen({super.key});

  @override
  State<CoursePurchaseScreen> createState() => _CoursePurchaseScreenState();
}

class _CoursePurchaseScreenState extends State<CoursePurchaseScreen> {
  final CourseService _service = CourseService();
  CourseDashboard? _dashboard;
  bool _loading = true;
  String? _error;
  String? _selectedOfferId;
  final TextEditingController _couponController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dashboard = await _service.fetchDashboard();
      if (!mounted) return;
      setState(() {
        _dashboard = dashboard;
        if (dashboard.offers.isNotEmpty) {
          _selectedOfferId = dashboard.offers.first.id;
        }
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  void _showCheckoutSheet(CourseOffer offer) {
    final sessions = _dashboard?.sessions ?? [];
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: 24 + MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Confirm purchase',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Text(offer.name, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 4),
              Text('${offer.price} • ${offer.status}', style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 16),
              if (sessions.isNotEmpty)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Upcoming live sessions', style: Theme.of(context).textTheme.labelLarge),
                    const SizedBox(height: 8),
                    ...sessions.take(3).map(
                          (session) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            dense: true,
                            leading: const Icon(Icons.videocam_outlined),
                            title: Text(session.name),
                            subtitle: Text('${session.date} • ${session.seats}'),
                            trailing: Text(session.price, style: Theme.of(context).textTheme.labelMedium),
                          ),
                        ),
                    const SizedBox(height: 12),
                  ],
                ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Subtotal', style: Theme.of(context).textTheme.bodyMedium),
                  Text(offer.price, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text('Estimated tax'),
                  Text('Calculated at payment')
                ],
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Purchase confirmed for ${offer.name}. Receipt sent via email.')),
                  );
                },
                child: const Text('Complete purchase'),
              )
            ],
          ),
        );
      },
    );
  }

  void _applyCoupon() {
    final code = _couponController.text.trim();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a coupon code to apply.')),
      );
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Coupon $code applied. Savings will appear at checkout.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final token = SessionManager.getAccessToken();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Purchase courses'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: token == null
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('Log in from the home screen to view purchase-ready cohorts and live sessions.'),
              ),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: _loading && _dashboard == null
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 220, child: Center(child: CircularProgressIndicator()))
                      ],
                    )
                  : ListView(
                      padding: const EdgeInsets.all(20),
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        if (_error != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Text(
                              _error!,
                              style: TextStyle(color: Colors.red.shade700),
                            ),
                          ),
                        _buildOfferSelection(),
                        const SizedBox(height: 20),
                        _buildCouponSection(),
                        const SizedBox(height: 20),
                        _buildInsights(),
                      ],
                    ),
            ),
    );
  }

  Widget _buildOfferSelection() {
    final offers = _dashboard?.offers ?? [];
    if (offers.isEmpty) {
      return Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('No live offers', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              SizedBox(height: 8),
              Text('Publish a new cohort from the instructor console to make it available for purchase.'),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Select a cohort', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        ...offers.map(
          (offer) => Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: RadioListTile<String>(
              value: offer.id,
              groupValue: _selectedOfferId,
              onChanged: (value) => setState(() => _selectedOfferId = value),
              title: Text(offer.name, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${offer.price} • ${offer.learners}'),
              secondary: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Chip(label: Text(offer.status)),
                  const SizedBox(height: 4),
                  Text(offer.conversion, style: Theme.of(context).textTheme.labelSmall),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () {
            final selected = offers.firstWhere(
              (offer) => offer.id == _selectedOfferId,
              orElse: () => offers.first,
            );
            _showCheckoutSheet(selected);
          },
          child: const Text('Review order'),
        )
      ],
    );
  }

  Widget _buildCouponSection() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Apply coupon', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            TextField(
              controller: _couponController,
              decoration: const InputDecoration(
                labelText: 'Coupon code',
                hintText: 'EXAMPLE20',
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _applyCoupon,
              icon: const Icon(Icons.local_offer_outlined),
              label: const Text('Apply savings'),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildInsights() {
    final insights = _dashboard?.insights ?? [];
    if (insights.isEmpty) {
      return const SizedBox.shrink();
    }
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Commerce insights', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ...insights.map(
              (insight) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.bolt_outlined, size: 20, color: Color(0xFF2D62FF)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        insight,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    )
                  ],
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}
