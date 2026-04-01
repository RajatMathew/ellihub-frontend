import { auth } from '../src/lib/auth';

async function seed() {
    // Configuration - CHANGE THESE!
    const email = 'admin@elli.com';
    const password = 'password123';
    const name = 'Elli Admin';
    const orgName = 'Default';
    const orgSlug = 'default';

    try {
        // Create user
        const user = await auth.api.createUser({
            body: {
                email,
                password,
                name,
                role: 'admin',
            },
        });

        if (!user?.user) throw new Error('Failed to create user');

        // Create organization
        // Note: The organizationHooks.afterCreateOrganization will automatically
        // initialize the owner role for this organization
        const org = await auth.api.createOrganization({
            body: {
                name: orgName,
                slug: orgSlug,
                userId: user.user.id,
            },
        });

        if (!org) throw new Error('Failed to create organization');

        console.log('✅ Super admin created!');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Org:', orgName);
        console.log('\n⚠️  Change password after first login!');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

seed().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
});
