export const createAccount = async (data: {
    fullname: string;
    email: string;
    password: string;
}) => {
    const res = await fetch("/api/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) throw new Error(json.message);

    return json;
};