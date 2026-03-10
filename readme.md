# Human Resources Application

Built using modern technologies: node.js, express, mongoDB and mongoose 😁

## Attendance Endpoints

The API now includes geofenced/time‑validated attendance check-in and check-out functionality.

### Routes

* `POST /api/attendance/check-in`
  * Requires authenticated user with an associated `Employee`.
  * Request body must contain `latitude` and `longitude`.
  * Validates company coordinates, allowed radius and employee working hours (start time ± tolerance).
  * Prevents multiple valid entries in the same day.
  * Records both successful and failed attempts (status `valid` or `invalid`).

* `POST /api/attendance/check-out`
  * Same location payload.
  * Requires an earlier entry record for the same day.
  * Validates against end time ± tolerance.
  * Prevents duplicate check‑outs.

* `GET /api/attendance/history?month=YYYY-MM` – optional query parameter to fetch a specific month; if omitted the current month is used. Admins may supply an `employee` parameter to fetch someone else's history.

### Reports

* `GET /api/v1/reports/dashboard` – returns a collection of metrics for the company of the current user, suitable for powering the dashboard cards and charts shown in the screenshots. Response contains total employees, today's presence/absence counts, vacation requests, salary cost figures with month-over-month change, simple alerts list and distributions by department and contract type. A snapshot of the data is also stored to `Report` collection for auditing. **Access restricted to company-admin/HR/manager/super-admin roles.**

Additional endpoints allow components to fetch only the necessary slice of data:

* `GET /api/v1/reports/departments` – list of `{ department, count }` ever active employees per department.
* `GET /api/v1/reports/contracts` – distribution of contract types with counts and percentages.
* `GET /api/v1/reports/alerts` – current alert messages generated from pending vacations, absences or payroll status.

### Employee profile resources

New API paths under `/api/v1/employees/:id` return information for a particular employee used by the profile screens shown in the attachments:

* `GET /api/v1/employees/:id/profile` – aggregates documents, performance reviews, goals, leave history, salary info, attendance summary and audit log.
* `GET /api/v1/employees/:id/documents` – list employee documents; `POST` also supported for upload metadata. Additional CRUD available under `/documents/:docId`.
* `GET /api/v1/employees/:id/performance` – performance reviews for the employee (yearly scores, comments).
* `GET /api/v1/employees/:id/goals` – defined goals with progress and deadlines; `POST`, `PATCH`, `DELETE` available.
* `GET /api/v1/employees/:id/vacations` – leave requests filtered to vacations (history).
* `GET /api/v1/employees/:id/salary` – static salary details plus payroll history for that employee.
* `GET /api/v1/employees/:id/attendance-summary[?month=YYYY-MM]` – summary of hours worked, overtime, just/unjust absences and raw attendance records for given month (defaults to current).
* `GET /api/v1/employees/:id/audit` – chronological audit entries relating to the employee.

* `GET /api/v1/attendance/monthly-report?month=YYYY-MM` – aggregated presence report. Employees see only their own; managers see their team; HR/admins see all. Returns per-employee totals: days, present days, absences, worked hours, latenesses.
* `POST /api/v1/attendance/absences/auto` – run automatic absence detection for today (creates records for those without entry). 
* `GET /api/v1/attendance/absences` – list absence entries.

* `/api/v1/overtime` endpoints support automatic detection (on check-out) and manual requests; managers/HR can approve via `PATCH /:id/approve`.

* Leave request enhancements:
  * `GET /api/v1/leave-request/pending` – pending approvals (with manager scoping).
  * `PATCH /api/v1/leave-request/:id/approve` – change status and deduct balance.
  * `GET /api/v1/leave-request/calendar` – approved leaves and licenses in month.
  * `GET /api/v1/leave-request/balance` – current leave balance (with optional ?employee).

* `GET /api/v1/leave-types` & CRUD – static list of available leave types (HR only).
* `GET /api/v1/leave-balance` & `PATCH /api/v1/leave-balance/adjust` – query and adjust leave balances.

These endpoints are protected by authentication and typically restricted to `company-admin`, `hr` or `manager` roles.

Both endpoints return `{ status, message, data }` with a `400` status for invalid entries. CRUD operations on `/api/attendance` still work for history queries.

