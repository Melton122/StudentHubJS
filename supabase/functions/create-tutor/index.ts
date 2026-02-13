// supabase/functions/create-tutor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";


serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()
    const { name, email, subject } = body

    // Basic validation
    if (!name || !email || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Check if tutor already exists
    const { data: existing, error: fetchError } = await supabase
      .from("tutors")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Tutor with this email already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      )
    }

    // Insert new tutor
    const { data, error } = await supabase
      .from("tutors")
      .insert([{ name, email, subject }])
      .select()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ message: "Tutor created successfully", tutor: data }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
