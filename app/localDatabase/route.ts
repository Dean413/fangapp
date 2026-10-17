interface Users {
    id: number;
    fullname: string;
    email: string;
    password: string;
}

let users: Users[] = []

export async function POST(req: Request) {
    try {
        const body = await req.json()
        if (!body.name) {
            return Response.json(
                { message: "name is required" },
                { status: 400 }
            )
        }

        if (!body.email) {
            return Response.json(
                { message: "email is required" },
                { status: 400 }
            )
        }

        const newUser: Users = {
            id: users.length + 1,
            fullname: body.fullname,
            email: body.email,
            password: body.password
        }

        users.push(newUser)
    } catch (error) {
        return Response.json(
            { message: "internal server error" },
            { status: 500 }
        )

    }

}
