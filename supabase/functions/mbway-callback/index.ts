Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const payload = await request.json();
  console.info('MB Way callback received', payload.reference ?? 'unknown');

  return Response.json({ received: true });
});
