variable "project" {
  type        = string
  description = "Project name used for tags and identifiers."
}

variable "environment" {
  type        = string
  description = "Deployment environment name."
}

variable "vpc_id" {
  type        = string
  description = "VPC identifier that hosts the database."
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet identifiers for the database subnet group."
}

variable "port" {
  type        = number
  description = "Database port to expose."
  default     = 5432
}

variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version."
  default     = "15.4"
}

variable "instance_class" {
  type        = string
  description = "Instance class for the RDS instance."
  default     = "db.m6g.large"
}

variable "allocated_storage" {
  type        = number
  description = "Initial allocated storage in GB."
  default     = 100
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage in GB for autoscaling."
  default     = 512
}

variable "master_username" {
  type        = string
  description = "Master database username."
}

variable "master_password" {
  type        = string
  description = "Master database password."
  sensitive   = true
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on destroy (set false for production)."
  default     = false
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups."
  default     = 7
}

variable "apply_immediately" {
  type        = bool
  description = "Apply modifications immediately or during maintenance window."
  default     = false
}

variable "auto_minor_version_upgrade" {
  type        = bool
  description = "Whether minor version upgrades are applied automatically."
  default     = true
}

variable "allowed_security_group_ids" {
  type        = list(string)
  description = "Security groups allowed to access the database."
  default     = []
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed to access the database."
  default     = []
}

variable "allowed_ipv6_cidr_blocks" {
  type        = list(string)
  description = "IPv6 CIDRs allowed to access the database."
  default     = []
}

variable "kms_key_id" {
  type        = string
  description = "Customer managed KMS key for storage encryption."
  default     = null
}

variable "deletion_protection" {
  type        = bool
  description = "Prevent accidental database deletion."
  default     = true
}

variable "storage_type" {
  type        = string
  description = "Storage type for the RDS instance (gp3, io1, io2)."
  default     = "gp3"
}

variable "performance_insights_retention_period" {
  type        = number
  description = "Retention period in days for Performance Insights (7, 731)."
  default     = 7
}

variable "monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds (0 disables)."
  default     = 60
}

variable "parameters" {
  description = "Additional parameter overrides for the Postgres parameter group."
  type = list(object({
    name         = string
    value        = string
    apply_method = string
  }))
  default = [
    {
      name         = "log_min_duration_statement"
      value        = "1000"
      apply_method = "pending-reboot"
    },
    {
      name         = "shared_preload_libraries"
      value        = "pg_stat_statements"
      apply_method = "pending-reboot"
    },
    {
      name         = "pg_stat_statements.max"
      value        = "10000"
      apply_method = "pending-reboot"
    }
  ]
}

variable "backup_window" {
  type        = string
  description = "Preferred backup window (hh24:mi-hh24:mi)."
  default     = null
}

variable "maintenance_window" {
  type        = string
  description = "Preferred maintenance window (ddd:hh24:mi-ddd:hh24:mi)."
  default     = null
}

variable "cloudwatch_logs_exports" {
  type        = list(string)
  description = "RDS logs to export to CloudWatch Logs."
  default     = ["postgresql", "upgrade"]
}

variable "tags" {
  type        = map(string)
  description = "Additional resource tags."
  default     = {}
}
