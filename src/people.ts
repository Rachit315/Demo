export type Person = {
  id: string;
  name: string;
  src: string;
  speaking?: boolean;
};

export const people: Person[] = [
  { id: "oguz", name: "Oğuz", src: "/avatars/oguz.webp", speaking: true },
  { id: "ashish", name: "Ashish", src: "/avatars/ashish.webp" },
  { id: "mariana", name: "Mariana", src: "/avatars/mariana.webp" },
  { id: "mds", name: "MDS", src: "/avatars/mds.webp" },
  { id: "ana", name: "Ana", src: "/avatars/ana.webp" },
  { id: "natko", name: "Natko", src: "/avatars/natko.webp", speaking: true },
  { id: "afshin", name: "Afshin", src: "/avatars/afshin.webp" },
];
