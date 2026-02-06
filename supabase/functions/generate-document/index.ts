import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Question {
  id: string;
  question: string;
  type: "text" | "textarea" | "select" | "date" | "number";
  options?: string[];
  required: boolean;
  placeholder?: string;
}

interface GenerateQuestionsRequest {
  templateType: "induction_register" | "rams_register" | "permit_to_work" | "f10_notification";
  projectName?: string;
}

interface GenerateDocumentRequest {
  templateType: "induction_register" | "rams_register" | "permit_to_work" | "f10_notification";
  answers: Record<string, string>;
  projectName?: string;
  organisationName?: string;
}

const TEMPLATE_PROMPTS: Record<string, string> = {
  induction_register: `You are generating questions for a UK Construction Site Induction Register.
The register tracks visitor/contractor sign-ins and ensures they've received site-specific safety briefings.

Generate 8-12 questions to gather site-specific information needed to create a customised induction register. Include:
- Site/project details (name, address, client)
- Site manager and safety officer details
- Emergency procedures (muster point, emergency contacts)
- Key hazards present on site
- PPE requirements for the site
- Any special access restrictions

Format each question with: id, question text, type (text/textarea/select/date/number), options if select, required boolean, and placeholder text.`,

  rams_register: `You are generating questions for a UK Construction SubContractor RAMS Register.
This register tracks submitted Risk Assessments and Method Statements from subcontractors.

Generate 8-12 questions to gather site-specific information needed to create a customised RAMS register. Include:
- Project/site details
- Principal contractor information
- List of work packages/trades expected on site
- Review and approval workflow contacts
- Document submission requirements
- Expiry/review period requirements

Format each question with: id, question text, type (text/textarea/select/date/number), options if select, required boolean, and placeholder text.`,

  permit_to_work: `You are generating questions for UK Construction Permit to Work Forms.
These forms authorise high-risk work activities like hot work, confined spaces, excavations etc.

Generate 10-15 questions to gather site-specific information needed to create customised permit forms. Include:
- Site/project identification
- Permit issuer and authoriser details
- Types of permits needed (hot work, confined space, excavation, working at height, electrical isolation)
- Site-specific hazards and controls
- Emergency procedures and rescue arrangements
- Isolation points and utilities
- Permit validity periods and shift handover procedures

Format each question with: id, question text, type (text/textarea/select/date/number), options if select, required boolean, and placeholder text.`,

  f10_notification: `You are generating questions for a UK HSE F10 Construction Project Notification (CDM 2015).
This is the official HSE notification required for notifiable construction projects under the Construction (Design and Management) Regulations 2015.

A project is notifiable if:
- Construction work will last more than 30 working days AND have more than 20 workers working simultaneously at any point
- OR exceeds 500 person days of construction work

Generate 15-20 questions to gather all information required for an F10 notification. Include:
- Project address and local authority
- Client details (name, address, contact)
- CDM Coordinator/Principal Designer details (for projects starting before April 2015) or Principal Designer details
- Principal Contractor details
- Project start date and planned duration
- Maximum number of workers on site at any one time
- Planned number of contractors on site
- Name of HSE notifier
- Whether the project involves demolition
- Brief description of the construction work

Format each question with: id, question text, type (text/textarea/select/date/number), options if select, required boolean, and placeholder text.`,
};

const DOCUMENT_GENERATION_PROMPTS: Record<string, string> = {
  induction_register: `You are creating a UK Construction Site Induction Register document.

Using the provided answers, generate a professional site induction register that includes:
1. Document header with site name, address, and document reference
2. Site rules and safety requirements section
3. Emergency procedures (evacuation points, emergency contacts)
4. Key hazards awareness section
5. PPE requirements checklist
6. Sign-in/out log table structure (columns: Date, Name, Company, Trade, Time In, Time Out, Inducted By, Signature)
7. Induction confirmation statement for visitors to sign

Make it compliant with CDM 2015 regulations and UK health & safety best practices.
Output as structured sections that can be formatted into a document.`,

  rams_register: `You are creating a UK Construction SubContractor RAMS Register document.

Using the provided answers, generate a professional RAMS register that includes:
1. Document header with project details and document reference
2. Principal contractor and project team contacts
3. RAMS submission requirements and deadlines
4. Register table structure (columns: RAMS Ref, Subcontractor, Work Package, Submitted Date, Reviewed By, Status, Expiry Date, Notes)
5. RAMS review checklist criteria
6. Approval workflow and escalation procedures
7. Non-compliance action section

Make it compliant with CDM 2015 regulations and UK health & safety best practices.
Output as structured sections that can be formatted into a document.`,

  permit_to_work: `You are creating UK Construction Permit to Work Forms.

Using the provided answers, generate professional permit to work form templates for:
1. Hot Work Permit
2. Confined Space Entry Permit
3. Excavation Permit
4. Working at Height Permit
5. Electrical Isolation Permit

Each permit should include:
- Permit reference and validity period
- Work location and description
- Hazards identified and control measures
- Required PPE and equipment
- Emergency procedures
- Isolation requirements where applicable
- Authorisation signatures (Permit Issuer, Permit Acceptor, Permit Closer)
- Checklist items for pre-work, during work, and completion

Make it compliant with UK health & safety regulations.
Output as structured sections that can be formatted into a document.`,

  f10_notification: `You are creating a UK HSE F10 Construction Project Notification form (CDM 2015).

Using the provided answers, generate an official F10 notification form that includes all required fields:

1. HSE area office (based on site location)
2. Whether notification is an initial notification or additional information
3. Exact address of construction site including postcode
4. Name and address of local authority
5. Brief description of the project
6. Client details: Name, full postal address, telephone number
7. Principal Designer details: Name, full postal address, telephone number
8. Principal Contractor details: Name, full postal address, telephone number
9. Project start date
10. Planned duration of construction work (in weeks)
11. Estimated maximum number of workers on site at any one time
12. Planned number of contractors on site
13. Name of person making the notification and their position
14. Declaration date and signature line

Format this as an official HSE F10 form structure.
Include a note about submission requirements (online at HSE website or by post).
Output as structured sections that can be formatted into a document.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "generate_questions") {
      const { templateType, projectName } = body as GenerateQuestionsRequest & { action: string };
      
      console.log(`Generating questions for template: ${templateType}`);

      const systemPrompt = TEMPLATE_PROMPTS[templateType];
      if (!systemPrompt) {
        return new Response(JSON.stringify({ error: "Invalid template type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userPrompt = `Generate the questions now. ${projectName ? `The project name is: ${projectName}` : ""}
      
Return ONLY valid JSON array of questions in this exact format:
[
  {
    "id": "site_name",
    "question": "What is the site/project name?",
    "type": "text",
    "required": true,
    "placeholder": "e.g. Ivy House Development"
  }
]

Do not include any markdown formatting or explanation.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "[]";
      
      // Parse the JSON response
      let questions: Question[];
      try {
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        } else if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }
        questions = JSON.parse(cleanContent.trim());
      } catch (parseError) {
        console.error("Failed to parse questions:", parseError, content);
        // Return fallback questions
        questions = getDefaultQuestions(templateType);
      }

      return new Response(JSON.stringify({ questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_document") {
      const { templateType, answers, projectName, organisationName } = body as GenerateDocumentRequest & { action: string };
      
      console.log(`Generating document for template: ${templateType}`);

      const systemPrompt = DOCUMENT_GENERATION_PROMPTS[templateType];
      if (!systemPrompt) {
        return new Response(JSON.stringify({ error: "Invalid template type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const answersText = Object.entries(answers)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      const userPrompt = `Generate the document now using these site-specific details:

Organisation: ${organisationName || "N/A"}
Project: ${projectName || "N/A"}

Answers provided:
${answersText}

Return the document content as a JSON object with these sections:
{
  "title": "Document title",
  "reference": "Document reference number",
  "date": "Document date",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Section content (can include bullet points using • character)",
      "type": "text" | "table" | "checklist"
    }
  ]
}

For tables, use this format in content:
"columns": ["Col1", "Col2"], "rows": [["Cell1", "Cell2"]]

For checklists, use this format in content:
"items": ["Item 1", "Item 2"]

Do not include any markdown formatting.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      
      // Parse the JSON response
      let documentData;
      try {
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        } else if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }
        documentData = JSON.parse(cleanContent.trim());
      } catch (parseError) {
        console.error("Failed to parse document:", parseError, content);
        return new Response(JSON.stringify({ error: "Failed to generate document structure" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ document: documentData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-document error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDefaultQuestions(templateType: string): Question[] {
  const commonQuestions: Question[] = [
    {
      id: "site_name",
      question: "What is the site/project name?",
      type: "text",
      required: true,
      placeholder: "e.g. Ivy House Development",
    },
    {
      id: "site_address",
      question: "What is the full site address?",
      type: "textarea",
      required: true,
      placeholder: "Enter the complete site address",
    },
    {
      id: "client_name",
      question: "Who is the client?",
      type: "text",
      required: true,
      placeholder: "e.g. ABC Construction Ltd",
    },
    {
      id: "site_manager",
      question: "Who is the Site Manager?",
      type: "text",
      required: true,
      placeholder: "Full name",
    },
    {
      id: "site_manager_phone",
      question: "Site Manager contact number?",
      type: "text",
      required: true,
      placeholder: "e.g. 07700 900000",
    },
  ];

  if (templateType === "induction_register") {
    return [
      ...commonQuestions,
      {
        id: "emergency_muster_point",
        question: "Where is the emergency muster point?",
        type: "text",
        required: true,
        placeholder: "e.g. Main car park by site entrance",
      },
      {
        id: "nearest_hospital",
        question: "What is the nearest hospital/A&E?",
        type: "text",
        required: true,
        placeholder: "Hospital name and address",
      },
      {
        id: "site_hazards",
        question: "What are the main hazards on this site?",
        type: "textarea",
        required: true,
        placeholder: "List key hazards (e.g. excavations, overhead work, traffic)",
      },
      {
        id: "ppe_requirements",
        question: "What PPE is mandatory on site?",
        type: "textarea",
        required: true,
        placeholder: "List required PPE items",
      },
    ];
  }

  if (templateType === "rams_register") {
    return [
      ...commonQuestions,
      {
        id: "principal_contractor",
        question: "Who is the Principal Contractor?",
        type: "text",
        required: true,
        placeholder: "Company name",
      },
      {
        id: "h_s_advisor",
        question: "Who is the Health & Safety Advisor?",
        type: "text",
        required: true,
        placeholder: "Full name",
      },
      {
        id: "rams_reviewer",
        question: "Who reviews and approves RAMS submissions?",
        type: "text",
        required: true,
        placeholder: "Full name and role",
      },
      {
        id: "work_packages",
        question: "What work packages/trades are expected on site?",
        type: "textarea",
        required: true,
        placeholder: "List expected trades (e.g. Groundworks, Steelwork, M&E)",
      },
      {
        id: "submission_deadline",
        question: "How far in advance must RAMS be submitted before work starts?",
        type: "select",
        options: ["24 hours", "48 hours", "1 week", "2 weeks"],
        required: true,
      },
    ];
  }

  if (templateType === "permit_to_work") {
    return [
      ...commonQuestions,
      {
        id: "permit_issuer",
        question: "Who is authorised to issue permits?",
        type: "text",
        required: true,
        placeholder: "Name and role",
      },
      {
        id: "permit_types",
        question: "Which permit types are required on this site?",
        type: "textarea",
        required: true,
        placeholder: "e.g. Hot Work, Confined Space, Excavation, Working at Height",
      },
      {
        id: "isolation_points",
        question: "Describe the main isolation points on site",
        type: "textarea",
        required: false,
        placeholder: "e.g. Main electrical isolator location, gas shutoff valve",
      },
      {
        id: "rescue_equipment",
        question: "What rescue equipment is available on site?",
        type: "textarea",
        required: true,
        placeholder: "e.g. Rescue harness, tripod, first aid kit locations",
      },
      {
        id: "shift_pattern",
        question: "What are the site working hours/shift patterns?",
        type: "text",
        required: true,
        placeholder: "e.g. Mon-Fri 07:30-17:00",
      },
    ];
  }

  // f10_notification defaults
  return [
    {
      id: "site_address",
      question: "What is the full site address including postcode?",
      type: "textarea",
      required: true,
      placeholder: "Full postal address of construction site",
    },
    {
      id: "local_authority",
      question: "Which local authority area is the site in?",
      type: "text",
      required: true,
      placeholder: "e.g. Manchester City Council",
    },
    {
      id: "project_description",
      question: "Brief description of the construction work",
      type: "textarea",
      required: true,
      placeholder: "Describe the nature of the construction project",
    },
    {
      id: "client_name",
      question: "Client name and organisation",
      type: "text",
      required: true,
      placeholder: "Full name or company name",
    },
    {
      id: "client_address",
      question: "Client's full postal address",
      type: "textarea",
      required: true,
      placeholder: "Full address including postcode",
    },
    {
      id: "client_phone",
      question: "Client telephone number",
      type: "text",
      required: true,
      placeholder: "e.g. 0161 123 4567",
    },
    {
      id: "principal_designer_name",
      question: "Principal Designer name and organisation",
      type: "text",
      required: true,
      placeholder: "Full name and company",
    },
    {
      id: "principal_designer_address",
      question: "Principal Designer's full postal address",
      type: "textarea",
      required: true,
      placeholder: "Full address including postcode",
    },
    {
      id: "principal_designer_phone",
      question: "Principal Designer telephone number",
      type: "text",
      required: true,
      placeholder: "e.g. 0161 123 4567",
    },
    {
      id: "principal_contractor_name",
      question: "Principal Contractor name and organisation",
      type: "text",
      required: true,
      placeholder: "Full name and company",
    },
    {
      id: "principal_contractor_address",
      question: "Principal Contractor's full postal address",
      type: "textarea",
      required: true,
      placeholder: "Full address including postcode",
    },
    {
      id: "principal_contractor_phone",
      question: "Principal Contractor telephone number",
      type: "text",
      required: true,
      placeholder: "e.g. 0161 123 4567",
    },
    {
      id: "start_date",
      question: "Project start date",
      type: "date",
      required: true,
    },
    {
      id: "duration_weeks",
      question: "Planned duration of construction work (in weeks)",
      type: "number",
      required: true,
      placeholder: "e.g. 52",
    },
    {
      id: "max_workers",
      question: "Maximum number of workers on site at any one time",
      type: "number",
      required: true,
      placeholder: "e.g. 25",
    },
    {
      id: "num_contractors",
      question: "Planned number of contractors on site",
      type: "number",
      required: true,
      placeholder: "e.g. 8",
    },
    {
      id: "notifier_name",
      question: "Name of person making this notification",
      type: "text",
      required: true,
      placeholder: "Your full name",
    },
    {
      id: "notifier_position",
      question: "Position/role of person making notification",
      type: "text",
      required: true,
      placeholder: "e.g. Health & Safety Manager",
    },
    {
      id: "involves_demolition",
      question: "Does the project involve demolition work?",
      type: "select",
      options: ["Yes", "No"],
      required: true,
    },
  ];
}
