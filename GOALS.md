# Goals

I'll use this file to keep track of the end goals of this project. The file will be updating as things change, check commit history for previous versions I suppose?

## initial architecture thoughts
- Next.js (App Router) 
- UI: Onboarding → Chat → Review → “Create in Drive”
    - Front facing UI components: basic page layout -> chat history (above) -> chat input field -> send button (with enter keyDown event) -> loading/thinkin/error state for LLM -> response bubbles or text.

### API routes (Node runtime):
- POST /api/plan: calls LLM, returns a validated manifest
- POST /api/drive/create: uses Google access token from browser to create folder + files
    - Auth to Google: Google Identity Services (GIS) in the browser → scope drive.file (least privilege). Send the short-lived token to your API route only at export time.

## Requirements
- Create a chatbot that can help High School aged Students plan their CTE Pathways
- Chatbot will lead students through a series of questions to help them identify their interests and skills
- Chatbot will use the information to generate a template for aCapstone Project, for their CTE Pathway
- The Capstone Project will be pushed to their Google Drive

### API's we'll be using: 
- Google Drive API: to store the Capstone Project Template
- OpenAI API: LLM of choice to converse with the student

