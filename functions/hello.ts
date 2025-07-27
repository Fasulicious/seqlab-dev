// functions/hello.ts
export const onRequest: PagesFunction = () => {
  return new Response("Hello from Functions!");
};
