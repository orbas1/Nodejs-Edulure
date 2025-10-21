# Environment Variable Updates

## New Requirements
- Remote bootstrap flows now enforce the presence of the following variables before Terraform executes:
  - `TERRAFORM_STATE_BUCKET`
  - `TERRAFORM_STATE_REGION`
  - `TERRAFORM_STATE_LOCK_TABLE`
  - `CONTAINER_IMAGE`
  - `DATABASE_USERNAME`
  - `DATABASE_PASSWORD`

## Local Quality-of-Life
- `BOOTSTRAP_SKIP_DATA_SEED=1` can be exported to skip local data seeding when standing up development stacks.

## Operational Guidance
- Ensure CI pipelines exporting Terraform plans define the above variables via secret management; otherwise bootstraps fail fast with descriptive messaging.
