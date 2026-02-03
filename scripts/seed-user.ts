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
        const user = await auth.api.signUpEmail({
            body: { email, password, name },
        });

        if (!user?.user) throw new Error('Failed to create user');

        // Create organization
        const org = await auth.api.createOrganization({
            body: {
                name: orgName,
                slug: orgSlug,
                userId: user.user.id,
            },
        });

        console.log('✅ Super admin created!');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('Org:', orgName);
        console.log('\n⚠️  Change password after first login!');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

seed();
