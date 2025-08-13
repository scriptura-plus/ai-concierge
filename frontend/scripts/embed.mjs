import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

const knowledge = [
  {
    content: "The capital of France is Paris."
  },
  {
    content: "The CEO of Google is Sundar Pichai."
  },
  {
    content: "The chemical formula for water is H2O."
  }
]

// Initialize the Google AI client with our new key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Initialize the Supabase client (this part doesn't change)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Main function to run the process
async function main() {
  console.log("Starting embedding process with Google AI...")

  const model = genAI.getGenerativeModel({ model: "embedding-001"});

  for (const doc of knowledge) {
    console.log(`Embedding: "${doc.content}"`)

    // 1. Ask Google to create a vector embedding
    const result = await model.embedContent(doc.content);
    const embedding = result.embedding.values;

    // 2. Store the original content and the new embedding in Supabase
    const { error } = await supabase.from('documents').insert({
      content: doc.content,
      embedding: embedding,
    })

    if (error) {
      console.error("Error inserting into Supabase:", error)
    } else {
      console.log("Successfully stored in Supabase.")
    }
  }

  console.log("Embedding process complete!")
}

main()

main()