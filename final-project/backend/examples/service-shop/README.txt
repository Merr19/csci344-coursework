Service Shop example
====================

This example demonstrates:

- managed User fields for role, display name, and email
- choices fields, including spreadsheet dropdowns
- a User foreign key field on VehicleService.technician
- role-aware permission arrays, such as update: [owner, technician, admin]
- sample seed data for users, /api/customers, and /api/services

Load it with:

  npm run build:example -- --dir service-shop --yes

Then sign in with one of:

  alex / password
  maya / password
  jordan / password
  casey / password
