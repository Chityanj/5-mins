 'use strict';

 const MAX_MESSAGES = 200;
 const MESSAGES_KEY = 'messages:global';

 const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
 const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
 const hasUpstash = !!(redisUrl && redisToken);

 // In-memory fallback (ephemeral across cold starts)
 const inMemoryMessages = [];

 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
   'Access-Control-Allow-Headers': 'Content-Type',
 };

 function jsonResponse(statusCode, data) {
   return {
     statusCode,
     headers: { 'Content-Type': 'application/json', ...corsHeaders },
     body: JSON.stringify(data),
   };
 }

 function generateId() {
   const a = Math.random().toString(36).slice(2, 10);
   const b = Date.now().toString(36).slice(-6);
   return `${a}${b}`;
 }

 async function upstash(command) {
   if (!hasUpstash) throw new Error('Upstash not configured');
   const res = await fetch(redisUrl, {
     method: 'POST',
     headers: {
       Authorization: `Bearer ${redisToken}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({ command }),
   });
   if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
   const data = await res.json();
   if (data && data.error) throw new Error(String(data.error));
   return data ? data.result : null;
 }

 async function getMessages() {
   if (hasUpstash) {
     const raw = await upstash(['LRANGE', MESSAGES_KEY, '0', String(MAX_MESSAGES - 1)]);
     const list = (Array.isArray(raw) ? raw : [])
       .map((s) => {
         try { return JSON.parse(s); } catch { return null; }
       })
       .filter(Boolean);
     return list;
   }
   return [...inMemoryMessages];
 }

 async function addMessage(message) {
   if (hasUpstash) {
     await upstash(['LPUSH', MESSAGES_KEY, JSON.stringify(message)]);
     await upstash(['LTRIM', MESSAGES_KEY, '0', String(MAX_MESSAGES - 1)]);
     return;
   }
   inMemoryMessages.unshift(message);
   if (inMemoryMessages.length > MAX_MESSAGES) inMemoryMessages.length = MAX_MESSAGES;
 }

 exports.handler = async (event) => {
   if (event.httpMethod === 'OPTIONS') {
     return { statusCode: 204, headers: corsHeaders, body: '' };
   }

   try {
     if (event.httpMethod === 'GET') {
       const messages = await getMessages();
       return jsonResponse(200, { messages });
     }

     if (event.httpMethod === 'POST') {
       if (!event.body) return jsonResponse(400, { error: 'Missing body' });
       let payload;
       try {
         payload = JSON.parse(event.body);
       } catch {
         return jsonResponse(400, { error: 'Invalid JSON' });
       }

       const text = typeof payload.text === 'string' ? payload.text.trim() : '';
       const author = typeof payload.author === 'string' ? payload.author.trim() : 'anon';
       if (!text) return jsonResponse(400, { error: 'Text is required' });
       if (text.length > 2000) return jsonResponse(400, { error: 'Text too long (max 2000 chars)' });
       if (author.length > 50) return jsonResponse(400, { error: 'Author too long (max 50 chars)' });

       const message = {
         id: generateId(),
         text,
         author: author || 'anon',
         timestamp: Date.now(),
       };
       await addMessage(message);
       return jsonResponse(201, { message });
     }

     return jsonResponse(405, { error: 'Method not allowed' });
   } catch (error) {
     return jsonResponse(500, { error: 'Internal error', details: String((error && error.message) || error) });
   }
 };


