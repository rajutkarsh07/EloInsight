// scripts/create_user.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'utkarsh@gmail.com';
    const password = 'utkarsh1245';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            username: 'utkarsh', // you can adjust username as needed
            password_hash: passwordHash,
            email_verified: false,
            is_active: true,
        },
    });
    console.log('Created user:', user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
