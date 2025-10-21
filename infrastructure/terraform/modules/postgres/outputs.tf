output "address" {
  description = "DNS address of the Postgres instance."
  value       = aws_db_instance.this.address
}

output "endpoint" {
  description = "Full endpoint (address:port) for the Postgres instance."
  value       = aws_db_instance.this.endpoint
}

output "port" {
  description = "Port the database listens on."
  value       = aws_db_instance.this.port
}

output "security_group_id" {
  description = "Security group protecting the Postgres instance."
  value       = aws_security_group.this.id
}

output "parameter_group_name" {
  description = "Name of the parameter group applied to the Postgres instance."
  value       = aws_db_parameter_group.this.name
}

output "monitoring_role_arn" {
  description = "IAM role ARN used for enhanced monitoring."
  value       = var.monitoring_interval > 0 ? aws_iam_role.monitoring[0].arn : null
}
