export type Person = {
  id: string;
  name: string;
  src: string;
  speaking?: boolean;
};

export const people: Person[] = [
  { id: "oguz", name: "Oğuz", src: "/avatars/oguz.png", speaking: true },
  { id: "ashish", name: "Ashish", src: "/avatars/ashish.png" },
  { id: "mariana", name: "Mariana", src: "/avatars/mariana.png" },
  { id: "mds", name: "MDS", src: "/avatars/mds.png" },
  { id: "ana", name: "Ana", src: "/avatars/ana.png" },
  { id: "natko", name: "Natko", src: "/avatars/natko.png", speaking: true },
  { id: "afshin", name: "Afshin", src: "/avatars/afshin.png" },
];
