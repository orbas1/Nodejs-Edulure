output "cpu_alarm_name" {
  value = aws_cloudwatch_metric_alarm.cpu_high.alarm_name
}

output "memory_alarm_name" {
  value = aws_cloudwatch_metric_alarm.memory_high.alarm_name
}

output "observability_dashboard_name" {
  value = var.enable_observability_dashboard && length(aws_cloudwatch_dashboard.service_overview) > 0 ? aws_cloudwatch_dashboard.service_overview[0].dashboard_name : null
}

output "environment_blueprint_parameter_arn" {
  value = length(aws_ssm_parameter.environment_blueprint) > 0 ? aws_ssm_parameter.environment_blueprint[0].arn : null
}
