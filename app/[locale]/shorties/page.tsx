"use client"
import Image from "next/image";
import { fetchStories } from "@/lib/fetch-stories";
import { GenreCard } from "@/components/cards/two-column-cards/genre-card";
import { FaLock } from "react-icons/fa";
import { useEffect, useState } from "react";

const Shorties = () => {
    const [books, setBooks] = useState<any[]>([]);


    useEffect(() => {
        const getBooks = async () => {
            try {
                const data = await fetchStories({ short: true, sort: "views", limit: 60 });
                setBooks(data);
            } catch (error) {
                console.log(error);
            } finally {

            }
        };

        getBooks();
    }, []);
    const genres = [
        "Billionaire",
        "Werewolf",
        "Romance",
        "Vampire",
        "Mafia",
        "Thriller",
        "Supernatural",
        "Erotic Romance",
        "Fantasy Romance",
        "Urban Fantasy",
        "Dark Romance",
        "Reverse Harem",
        "Drama",
        "Paranormal",
        "LGBTQ+"
    ];
    return (
        <div className="bg-gray-50 dark:bg-dark">
            <div className="relative w-[90%] mx-auto ">
                <h1 className="text-3xl font-bold mt-8">Shorties</h1>
                <div className="flex gap-8 my-6 w-8/8 flex-wrap">
                    {genres.map((genre, index) => (
                        <p className="text-gray-400 dark:text-neutral-500" key={index}>{genre}</p>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 sm:grid-cols-2 gap-4 ">
                    {books.map((item) => (
                        <GenreCard key={item.id} {...item} />
                    ))}
                </div>

            </div>
        </div>
    );
};

export default Shorties;