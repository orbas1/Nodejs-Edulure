locals {
  environment_blueprint_payload = {
    version      = "2024.06"
    generated_at = timestamp()
    project      = var.project
    environment  = var.environment
    region       = var.region
    service = {
      name            = local.service_name
      image           = var.container_image
      cpu             = var.cpu
      memory          = var.memory
      port            = var.container_port
      healthcheckPath = var.healthcheck_path
    }
    scaling = {
      desiredCount      = var.desired_count
      maximumCount      = var.max_count
      cpuTargetPercent  = var.cpu_target_utilization
      memoryTargetPercent = var.memory_target_utilization
    }
    networking = {
      vpcId            = var.vpc_id
      privateSubnetIds = var.private_subnet_ids
      publicSubnetIds  = var.public_subnet_ids
      loadBalancerDns  = aws_lb.this.dns_name
      securityGroupId  = aws_security_group.service.id
    }
    observability = {
      logGroupName = aws_cloudwatch_log_group.service.name
      alarms = {
        cpuHigh    = aws_cloudwatch_metric_alarm.cpu_high.alarm_name
        memoryHigh = aws_cloudwatch_metric_alarm.memory_high.alarm_name
      }
      dashboardName = var.enable_observability_dashboard && length(aws_cloudwatch_dashboard.service_overview) > 0 ? aws_cloudwatch_dashboard.service_overview[0].dashboard_name : null
    }
    metadata = length(var.blueprint_metadata) > 0 ? var.blueprint_metadata : null
  }
}

resource "aws_ssm_parameter" "environment_blueprint" {
  count = var.blueprint_parameter_name != null && trimspace(var.blueprint_parameter_name) != "" ? 1 : 0

  name        = var.blueprint_parameter_name
  description = "Environment provisioning blueprint for ${local.service_name}."
  type        = "String"
  overwrite   = true
  value       = jsonencode(local.environment_blueprint_payload)

  tags = merge({
    Project     = var.project
    Environment = var.environment
    Service     = local.service_name
    Blueprint   = "environment"
  }, var.tags)
}
