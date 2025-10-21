variable "project" {
  type        = string
  description = "Project name used for tags and identifiers."
}

variable "environment" {
  type        = string
  description = "Deployment environment name."
  validation {
    condition     = contains(["local", "dev", "staging", "prod"], lower(var.environment))
    error_message = "Environment must be one of local, dev, staging, or prod."
  }
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
  validation {
    condition     = var.allocated_storage >= 20
    error_message = "Allocated storage must be at least 20GB to satisfy automated backup requirements."
  }
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage in GB for autoscaling."
  default     = 512
  validation {
    condition     = var.max_allocated_storage >= var.allocated_storage
    error_message = "Maximum allocated storage must be greater than or equal to the baseline allocation."
  }
}

variable "master_username" {
  type        = string
  description = "Master database username."
}

variable "master_password" {
  type        = string
  description = "Master database password."
  sensitive   = true
  validation {
    condition = (
      length(var.master_password) >= 16 &&
      can(regex("[A-Z]", var.master_password)) &&
      can(regex("[a-z]", var.master_password)) &&
      can(regex("[0-9]", var.master_password)) &&
      can(regex("[^A-Za-z0-9]", var.master_password))
    )
    error_message = "Master password must be at least 16 characters and include upper, lower, numeric, and special characters."
  }
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on destroy (set false for production)."
  default     = false
  validation {
    condition     = !(lower(var.environment) == "prod" && var.skip_final_snapshot)
    error_message = "Production environments must retain a final snapshot on database destruction."
  }
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups."
  default     = 7
  validation {
    condition = var.backup_retention_period >= (
      contains(["prod"], lower(var.environment)) ? 14 : 7
    )
    error_message = "Production environments require at least 14 days of backup retention; lower tiers must retain 7 or more days."
  }
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
  validation {
    condition     = alltrue([for sg in var.allowed_security_group_ids : length(trim(sg)) > 0])
    error_message = "Security group identifiers cannot be empty strings."
  }
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed to access the database."
  default     = []
  validation {
    condition = alltrue([
      for cidr in var.allowed_cidr_blocks : (
        can(cidrhost(cidr, 0)) &&
        (cidr != "0.0.0.0/0" ? true : lower(var.environment) == "local")
      )
    ])
    error_message = "CIDR blocks must be valid IPv4 ranges resolvable by Terraform. 0.0.0.0/0 is only permitted for the local environment."
  }
}

variable "allowed_ipv6_cidr_blocks" {
  type        = list(string)
  description = "IPv6 CIDRs allowed to access the database."
  default     = []
  validation {
    condition = alltrue([
      for cidr in var.allowed_ipv6_cidr_blocks : (
        can(cidrhost(cidr, 0)) &&
        (cidr != "::/0" ? true : lower(var.environment) == "local")
      )
    ])
    error_message = "CIDR blocks must be valid IPv6 ranges resolvable by Terraform. ::/0 is only permitted for the local environment."
  }
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
