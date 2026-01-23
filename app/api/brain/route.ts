/**
 * AI Brain API Route - Investor OS
 * Unified chat interface with tool calling for investment intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getInvestorOSAnthropicTools } from '@/lib/ai/tools-investor-os';
import { executeInvestorOSTool } from '@/lib/ai/tool-executor-investor-os';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the AI Brain for Red Beard Ventures (VC fund) and Denarii Labs (advisory company). You have access to a comprehensive knowledge graph of people, organizations, deals, investments, conversations, and relationships.

Your core capabilities:
- Generate briefings on people, organizations, and deals with context-aware insights
- Search the knowledge graph with natural language queries
- Detect risks in deals and portfolio companies (runway, burn rate, relationship staleness)
- Find warm intro paths between people through your network
- Track investment pipeline from sourcing to portfolio
- Manage LP relationships and fund commitments
- Extract and validate facts with automatic conflict detection
- Create and discover relationships dynamically

Response modes:
1. **Briefing**: Provide comprehensive context on an entity with recent activity, key facts, risks, and next actions
2. **Search & Shortlist**: Find and rank relevant entities based on criteria
3. **Analysis**: Deep dive on specific questions (deal risks, market trends, relationship strength)
4. **System Update**: Add facts, create relationships, update deal stages
5. **Network Navigation**: Map relationship paths, identify connectors, warm intro routing

Guidelines:
- Always ground answers in the knowledge graph - cite sources and confidence levels
- Respect privacy tiers: never expose HIGHLY_SENSITIVE facts in external communications
- When adding facts, be explicit about provenance (source, date, confidence)
- Flag conflicts for user review when automatic resolution isn't appropriate
- Present risks objectively with severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Format dates as YYYY-MM-DD, money as $X,XXX, percentages as X.X%
- Use the relationship graph to provide context ("You met them through...")
- When uncertain, query the graph rather than guessing

Current date: ${new Date().toISOString().split('T')[0]}
All amounts are in USD unless specified otherwise.`;

// Determine which AI provider to use
function getProvider(): 'anthropic' | null {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

// Type for messages
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// POST - Send a message and get streaming response
export async function POST(request: NextRequest) {
  const provider = getProvider();

  if (!provider) {
    return NextResponse.json(
      { error: 'No AI provider configured. Set ANTHROPIC_API_KEY.' },
      { status: 500 }
    );
  }

  try {
    const { messages } = await request.json();

    // Stream the response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          const toolCallsLog: unknown[] = [];

          fullResponse = await streamAnthropicResponse(
            messages,
            controller,
            encoder,
            toolCallsLog
          );

          // Save the assistant message
//           await prisma.fact.create({
//             data: {
//               conversationId,
//               role: 'assistant',
//               content: fullResponse,
//               toolCalls: toolCallsLog.length > 0 ? JSON.stringify(toolCallsLog) : null
//             }
//           });
// 
//           // Update conversation title if it's the first exchange
//           const messageCount = await prisma.fact.count({
//             where: { conversationId }
//           });
//           if (messageCount === 2) {
//             await prisma.conversation.update({
//               where: { id: conversationId },
//               data: { title: userMessage.content.slice(0, 50) }
//             });
//           }
// 
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
          })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Brain API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Stream response from Anthropic Claude
async function streamAnthropicResponse(
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  toolCallsLog: unknown[]
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  let fullResponse = '';
  let currentMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }));

  // Loop to handle tool use
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: getInvestorOSAnthropicTools(),
      messages: currentMessages,
    });

    // Process each content block
    for (const block of response.content) {
      if (block.type === 'text') {
        fullResponse += block.text;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'text',
          content: block.text
        })}\n\n`));
      } else if (block.type === 'tool_use') {
        // Notify client about tool use
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'tool_use',
          name: block.name,
          input: block.input
        })}\n\n`));

        // Execute the tool
        const toolResult = await executeInvestorOSTool(
          block.name,
          block.input as Record<string, unknown>
        );

        toolCallsLog.push({
          name: block.name,
          input: block.input,
          result: toolResult
        });

        // Add the tool result to messages for the next iteration
        currentMessages = [
          ...currentMessages,
          { role: 'assistant' as const, content: response.content as unknown as string },
          {
            role: 'user' as const,
            content: [{
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(toolResult)
            }] as unknown as string
          }
        ];
      }
    }

    // If no tool use, we're done
    if (response.stop_reason !== 'tool_use') {
      break;
    }
  }

  return fullResponse;
}

// GET - Load conversation history or list conversations
// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const conversationId = searchParams.get('conversationId');
// 
//   try {
//     if (conversationId) {
//       const messages = await prisma.fact.findMany({
//         where: { conversationId },
//         orderBy: { createdAt: 'asc' }
//       });
// 
//       return NextResponse.json({
//         messages: messages.map(m => ({
//           id: m.id,
//           role: m.role,
//           content: m.content,
//           createdAt: m.createdAt.toISOString()
//         }))
//       });
//     }
// 
//     // List recent conversations
//     const conversations = await prisma.conversation.findMany({
//       take: 20,
//       orderBy: { updatedAt: 'desc' },
//       include: {
//         messages: {
//           take: 1,
//           orderBy: { createdAt: 'asc' }
//         }
//       }
//     });
// 
//     return NextResponse.json({
//       conversations: conversations.map(c => ({
//         id: c.id,
//         title: c.title || c.messages[0]?.content?.slice(0, 50) || 'New conversation',
//         updatedAt: c.updatedAt.toISOString(),
//         preview: c.messages[0]?.content?.slice(0, 100) || ''
//       }))
//     });
//   } catch (error) {
//     console.error('Get conversations error:', error);
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : 'Unknown error' },
//       { status: 500 }
//     );
//   }
// }

// DELETE - Delete a conversation
// export async function DELETE(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const conversationId = searchParams.get('conversationId');
// 
//   if (!conversationId) {
//     return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
//   }
// 
//   try {
//     await prisma.conversation.delete({
//       where: { id: conversationId }
//     });
// 
//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error('Delete conversation error:', error);
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : 'Unknown error' },
//       { status: 500 }
//     );
//   }
// }
