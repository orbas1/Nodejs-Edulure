locals {
  service_alarm_dimensions = {
    ClusterName = aws_ecs_cluster.this.name
    ServiceName = aws_ecs_service.this.name
  }

  observability_dashboard_name = lower(replace("${var.project}-${var.environment}-api-observability", " ", "-"))

  observability_dashboard_widgets = [
    {
      type       = "metric"
      x          = 0
      y          = 0
      width      = 12
      height     = 6
      properties = {
        title  = "ECS Utilisation"
        region = var.region
        view   = "timeSeries"
        stacked = false
        metrics = [
          [
            "AWS/ECS",
            "CPUUtilization",
            "ClusterName",
            aws_ecs_cluster.this.name,
            "ServiceName",
            aws_ecs_service.this.name,
            { "stat" = "Average", "label" = "CPU %" }
          ],
          [
            "AWS/ECS",
            "MemoryUtilization",
            "ClusterName",
            aws_ecs_cluster.this.name,
            "ServiceName",
            aws_ecs_service.this.name,
            { "stat" = "Average", "label" = "Memory %" }
          ]
        ]
        yAxis = {
          left = {
            min   = 0
            max   = 100
            label = "%"
          }
        }
      }
    },
    {
      type       = "metric"
      x          = 12
      y          = 0
      width      = 12
      height     = 6
      properties = {
        title  = "ECS Desired vs Running Tasks"
        region = var.region
        view   = "timeSeries"
        stacked = false
        metrics = [
          [
            "AWS/ECS",
            "DesiredTaskCount",
            "ClusterName",
            aws_ecs_cluster.this.name,
            "ServiceName",
            aws_ecs_service.this.name,
            { "stat" = "Average", "label" = "Desired" }
          ],
          [
            "AWS/ECS",
            "RunningTaskCount",
            "ClusterName",
            aws_ecs_cluster.this.name,
            "ServiceName",
            aws_ecs_service.this.name,
            { "stat" = "Average", "label" = "Running" }
          ]
        ]
      }
    },
    {
      type       = "metric"
      x          = 0
      y          = 6
      width      = 12
      height     = 6
      properties = {
        title  = "ALB Requests & 5XX"
        region = var.region
        view   = "timeSeries"
        stacked = false
        period = 60
        metrics = [
          [
            "AWS/ApplicationELB",
            "RequestCount",
            "LoadBalancer",
            aws_lb.this.arn_suffix,
            "TargetGroup",
            aws_lb_target_group.this.arn_suffix,
            { "stat" = "Sum", "label" = "Requests" }
          ],
          [
            "AWS/ApplicationELB",
            "HTTPCode_Target_5XX_Count",
            "LoadBalancer",
            aws_lb.this.arn_suffix,
            "TargetGroup",
            aws_lb_target_group.this.arn_suffix,
            { "stat" = "Sum", "label" = "5XX" }
          ]
        ]
      }
    },
    {
      type       = "metric"
      x          = 12
      y          = 6
      width      = 12
      height     = 6
      properties = {
        title  = "Target Response Time"
        region = var.region
        view   = "timeSeries"
        stacked = false
        period = 60
        metrics = [
          [
            "AWS/ApplicationELB",
            "TargetResponseTime",
            "LoadBalancer",
            aws_lb.this.arn_suffix,
            "TargetGroup",
            aws_lb_target_group.this.arn_suffix,
            { "stat" = "p90", "label" = "p90" }
          ]
        ]
      }
    }
  ]
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name                = "${local.service_name}-cpu-high"
  alarm_description         = "Average CPU utilisation above ${var.cpu_alarm_threshold}% for ${local.service_name}."
  comparison_operator       = "GreaterThanOrEqualToThreshold"
  evaluation_periods        = var.alarm_evaluation_periods
  datapoints_to_alarm       = var.alarm_datapoints_to_alarm
  threshold                 = var.cpu_alarm_threshold
  namespace                 = "AWS/ECS"
  metric_name               = "CPUUtilization"
  dimensions                = local.service_alarm_dimensions
  statistic                 = "Average"
  period                    = 60
  treat_missing_data        = "notBreaching"
  alarm_actions             = var.alarm_topic_arns
  ok_actions                = var.alarm_topic_arns
  insufficient_data_actions = []
  tags                      = var.tags
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name                = "${local.service_name}-memory-high"
  alarm_description         = "Average memory utilisation above ${var.memory_alarm_threshold}% for ${local.service_name}."
  comparison_operator       = "GreaterThanOrEqualToThreshold"
  evaluation_periods        = var.alarm_evaluation_periods
  datapoints_to_alarm       = var.alarm_datapoints_to_alarm
  threshold                 = var.memory_alarm_threshold
  namespace                 = "AWS/ECS"
  metric_name               = "MemoryUtilization"
  dimensions                = local.service_alarm_dimensions
  statistic                 = "Average"
  period                    = 60
  treat_missing_data        = "notBreaching"
  alarm_actions             = var.alarm_topic_arns
  ok_actions                = var.alarm_topic_arns
  insufficient_data_actions = []
  tags                      = var.tags
}

resource "aws_cloudwatch_dashboard" "service_overview" {
  count          = var.enable_observability_dashboard ? 1 : 0
  dashboard_name = local.observability_dashboard_name
  dashboard_body = jsonencode({
    start          = "-6h"
    periodOverride = "inherit"
    widgets        = local.observability_dashboard_widgets
  })
}
