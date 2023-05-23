import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function pFindUserByEmail(email) {
	return await prisma.user.findFirst({
		where: {
			email: email
		}
	}) 
}

export { pFindUserByEmail }