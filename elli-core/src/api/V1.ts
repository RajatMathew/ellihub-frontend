import { auth } from '@lib/auth';
import { authMiddleware } from '@middleware/auth';
import { activityLogRoutes } from '@modules/activity-log';
import { contactRoutes } from '@modules/contact';
import { costCodeRoutes } from '@modules/cost-code';
import { departmentRoutes } from '@modules/department';
import { emailPublicRoutes, emailRoutes } from '@modules/email';
import { employeeRoutes } from '@modules/employee';
import { feedbackRoutes } from '@modules/feedback';
import { fileRoutes } from '@modules/file';
import { gcRoutes } from '@modules/gc';
import { integrationPublicRoutes, integrationRoutes } from '@modules/integrations';
import { invoiceRoutes } from '@modules/invoice';
import { lookupRoutes } from '@modules/lookup';
import { mailRoutes } from '@modules/mail';
import { monthlyBillsRoutes } from '@modules/monthly-bills';
import { pdfRoutes } from '@modules/pdf';
import { poRoutes } from '@modules/po';
import { primeChangeOrderRoutes } from '@modules/prime-change-order';
import { projectRoutes } from '@modules/project';
import { ptoRoutes } from '@modules/pto';
import { revisionRoutes } from '@modules/revision';
import { rfqRoutes } from '@modules/rfq';
import { scoRoutes } from '@modules/sco';
import { templateSettingRoutes } from '@modules/template-setting';
import { userRoutes } from '@modules/user';
import { vendorRoutes } from '@modules/vendor';
import { Hono } from 'hono';

const app = new Hono();

app.on(['POST', 'GET'], '/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

app.route('/integrations', integrationPublicRoutes);
app.route('/email', emailPublicRoutes);

app.use('/*', authMiddleware);

app.route('/cost-code', costCodeRoutes);
app.route('/users', userRoutes);
app.route('/feedback', feedbackRoutes);
app.route('/file', fileRoutes);
app.route('/hr/employee', employeeRoutes);
app.route('/hr/department', departmentRoutes);
app.route('/hr/pto', ptoRoutes);
app.route('/lookup', lookupRoutes);
app.route('/mail', mailRoutes);
app.route('/email', emailRoutes);
app.route('/pdf', pdfRoutes);
app.route('/template-settings', templateSettingRoutes);
app.route('/integrations', integrationRoutes);
app.route('/vendor', vendorRoutes);
app.route('/gc', gcRoutes);
app.route('/contact', contactRoutes);
app.route('/activity-log', activityLogRoutes);
app.route('/project', projectRoutes);
app.route('/rfq', rfqRoutes);
app.route('/purchase-order', poRoutes);
app.route('/prime-change-order', primeChangeOrderRoutes);
app.route('/sub-change-order', scoRoutes);
app.route('/invoice', invoiceRoutes);
app.route('/revision', revisionRoutes);
app.route('/monthly-bills', monthlyBillsRoutes);

export default app;
