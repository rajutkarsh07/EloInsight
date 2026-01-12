const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'utkarsh@gmail.com';
    const password = 'utkarsh1245';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            username: 'utkarsh',
            passwordHash: passwordHash,
            emailVerified: false,
            isActive: true,
        },
    });
    console.log('Created user:', user);
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
