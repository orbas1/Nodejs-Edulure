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
