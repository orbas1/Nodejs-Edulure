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
    condition     = length(var.master_password) >= 16 && can(regex("[A-Z]", var.master_password)) && can(regex("[0-9]", var.master_password))
    error_message = "Master password must be at least 16 characters and include an uppercase letter and a number."
  }
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
      for cidr in var.allowed_cidr_blocks : can(cidrnetmask(cidr)) && (
        cidr != "0.0.0.0/0" ? true : lower(var.environment) == "local"
      )
    ])
    error_message = "CIDR blocks must be valid IPv4 ranges. 0.0.0.0/0 is only permitted for the local environment."
  }
}

variable "allowed_ipv6_cidr_blocks" {
  type        = list(string)
  description = "IPv6 CIDRs allowed to access the database."
  default     = []
  validation {
    condition = alltrue([
      for cidr in var.allowed_ipv6_cidr_blocks : can(cidrnetmask(cidr)) && (
        cidr != "::/0" ? true : lower(var.environment) == "local"
      )
    ])
    error_message = "CIDR blocks must be valid IPv6 ranges. ::/0 is only permitted for the local environment."
  }
}

variable "tags" {
  type        = map(string)
  description = "Additional resource tags."
  default     = {}
}
