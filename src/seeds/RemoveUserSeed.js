import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main () {
	try {
		const deletedData = await prisma.user.deleteMany({})
		console.log('Deleted all user Records')
	} catch (err) {
		console.log('the Deletion failed: ', err)
	}
}

await main()