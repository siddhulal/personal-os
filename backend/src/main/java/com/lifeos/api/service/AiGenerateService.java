package com.lifeos.api.service;

import com.lifeos.api.ai.AiMessage;
import com.lifeos.api.ai.AiProvider;
import com.lifeos.api.ai.AiProviderRegistry;
import com.lifeos.api.ai.AiRequest;
import com.lifeos.api.dto.AiGenerateRequest;
import com.lifeos.api.dto.AiGenerateResponse;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.InterviewAnswerRepository;
import com.lifeos.api.repository.InterviewQuestionRepository;
import com.lifeos.api.repository.LearningTopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiGenerateService {

    private final LearningTopicRepository topicRepository;
    private final InterviewQuestionRepository questionRepository;
    private final InterviewAnswerRepository answerRepository;
    private final AiSettingsService settingsService;
    private final AiProviderRegistry providerRegistry;

    public AiGenerateResponse generateExamples(UUID topicId) {
        User user = getCurrentUser();
        LearningTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", "id", topicId));

        String roadmapTitle = topic.getRoadmap().getTitle();
        String prompt = String.format(
                "Generate practical code examples for the topic '%s' from the learning roadmap '%s'. " +
                "Include:\n" +
                "1. A beginner-friendly example with detailed comments\n" +
                "2. An intermediate example showing common patterns\n" +
                "3. A real-world use case example\n\n" +
                "Topic description: %s\n\n" +
                "Format each example with a title, explanation, and well-commented code. Use markdown.",
                topic.getTitle(),
                roadmapTitle,
                topic.getDescription() != null ? topic.getDescription() : "No description provided"
        );

        String response = callProvider(user, prompt);
        return AiGenerateResponse.builder()
                .content(response)
                .type("examples")
                .build();
    }

    public AiGenerateResponse generateDiagram(UUID topicId, String diagramType) {
        User user = getCurrentUser();
        LearningTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", "id", topicId));

        String type = diagramType != null ? diagramType : "flowchart";
        String prompt = String.format(
                "Generate a Mermaid diagram (%s) for the topic '%s'. " +
                "The diagram should visually represent the key concepts, relationships, or processes involved. " +
                "Topic description: %s\n\n" +
                "IMPORTANT Mermaid syntax rules:\n" +
                "- Use ONLY square brackets for node labels: A[Label Text]\n" +
                "- If a label contains parentheses, wrap it in quotes: A[\"Text (example)\"]\n" +
                "- Do NOT use semicolons at end of lines\n" +
                "- Do NOT use special characters like &, <, > in labels without quotes\n" +
                "- Keep node IDs short (A, B, C or A1, A2, etc.)\n\n" +
                "Return ONLY the Mermaid diagram code wrapped in a ```mermaid code block. " +
                "Make the diagram comprehensive but readable. Use descriptive labels.",
                type,
                topic.getTitle(),
                topic.getDescription() != null ? topic.getDescription() : "No description provided"
        );

        String response = callProvider(user, prompt);
        return AiGenerateResponse.builder()
                .content(response)
                .type("diagram")
                .build();
    }

    public AiGenerateResponse generateInterviewAnswer(UUID questionId) {
        User user = getCurrentUser();
        InterviewQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));

        String category = question.getCategory();
        String prompt;

        if ("BEHAVIORAL".equalsIgnoreCase(category) || "SITUATIONAL".equalsIgnoreCase(category)) {
            prompt = String.format(
                    "Generate a model interview answer for this %s question:\n\n" +
                    "\"%s\"\n\n" +
                    "Use the STAR method (Situation, Task, Action, Result). " +
                    "Provide:\n" +
                    "1. A complete STAR-format answer\n" +
                    "2. Key points to emphasize\n" +
                    "3. Common mistakes to avoid\n\n" +
                    "Make the answer sound natural and personal, not robotic. Use markdown formatting.",
                    category, question.getQuestionText()
            );
        } else {
            prompt = String.format(
                    "Generate a model interview answer for this %s question (Difficulty: %s):\n\n" +
                    "\"%s\"\n\n" +
                    "Provide:\n" +
                    "1. A clear explanation of the approach\n" +
                    "2. Code solution (if applicable) with comments\n" +
                    "3. Time and space complexity analysis\n" +
                    "4. Follow-up questions to expect\n\n" +
                    "Use markdown formatting.",
                    category, question.getDifficulty().name(), question.getQuestionText()
            );
        }

        String response = callProvider(user, prompt);
        return AiGenerateResponse.builder()
                .content(response)
                .type("interview_answer")
                .build();
    }

    public AiGenerateResponse improveAnswer(UUID questionId, UUID answerId, String action) {
        User user = getCurrentUser();
        InterviewQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));
        InterviewAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new ResourceNotFoundException("Answer", "id", answerId));

        String prompt = switch (action != null ? action.toLowerCase() : "improve") {
            case "details" -> String.format(
                    "Add more details and depth to this interview answer for the question:\n\n" +
                    "Question: \"%s\"\n\n" +
                    "Current Answer:\n%s\n\n" +
                    "Expand with more specific details, concrete examples, and deeper insights. " +
                    "Maintain the original structure and key points. Use markdown formatting.",
                    question.getQuestionText(), answer.getAnswerText()
            );
            case "explain" -> String.format(
                    "Provide a more detailed explanation for this interview answer:\n\n" +
                    "Question: \"%s\"\n\n" +
                    "Current Answer:\n%s\n\n" +
                    "Break down the key concepts, explain the reasoning behind each point, " +
                    "and add clarifying examples. Use markdown formatting.",
                    question.getQuestionText(), answer.getAnswerText()
            );
            default -> String.format(
                    "Improve this interview answer for the question:\n\n" +
                    "Question: \"%s\"\n\n" +
                    "Current Answer:\n%s\n\n" +
                    "Make it more compelling, structured, and impactful. " +
                    "Improve clarity, add stronger examples, and ensure it demonstrates competency. " +
                    "Use markdown formatting.",
                    question.getQuestionText(), answer.getAnswerText()
            );
        };

        String response = callProvider(user, prompt);
        return AiGenerateResponse.builder()
                .content(response)
                .type("improved_answer")
                .build();
    }

    public AiGenerateResponse generateInterviewQuestions(AiGenerateRequest request) {
        User user = getCurrentUser();
        int count = request.getCount() != null ? Math.min(request.getCount(), 20) : 5;
        String category = request.getCategory() != null ? request.getCategory() : "MIXED";
        String difficulty = request.getDifficulty() != null ? request.getDifficulty() : "MIXED";

        String prompt = String.format(
                "Generate exactly %d interview questions.\n" +
                "Category: %s\n" +
                "Difficulty: %s\n\n" +
                "IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.\n" +
                "Each object must have these exact fields:\n" +
                "- \"question\": the interview question text\n" +
                "- \"category\": one of BEHAVIORAL, TECHNICAL, SYSTEM_DESIGN, CODING, SITUATIONAL\n" +
                "- \"difficulty\": one of EASY, MEDIUM, HARD\n\n" +
                "Example format:\n" +
                "[{\"question\":\"Tell me about a time...\",\"category\":\"BEHAVIORAL\",\"difficulty\":\"MEDIUM\"}]\n\n" +
                "Return ONLY the JSON array, nothing else.",
                count,
                "MIXED".equals(category) ? "a mix of categories (BEHAVIORAL, TECHNICAL, SYSTEM_DESIGN, CODING, SITUATIONAL)" : category,
                "MIXED".equals(difficulty) ? "a mix of difficulties (EASY, MEDIUM, HARD)" : difficulty
        );

        String response = callProvider(user, prompt);
        return AiGenerateResponse.builder()
                .content(response)
                .type("interview_questions")
                .build();
    }

    public AiGenerateResponse processNoteText(AiGenerateRequest request) {
        User user = getCurrentUser();
        String action = request.getAction();
        String selectedText = request.getSelectedText() != null ? request.getSelectedText() : "";
        String context = request.getContext() != null ? request.getContext() : "";

        // Truncate context to last 4000 chars to avoid token overflow
        if (context.length() > 4000) {
            context = context.substring(context.length() - 4000);
        }

        String contextPrefix = context.isEmpty() ? "" :
                "Here is the full note context for reference:\n---\n" + context + "\n---\n\n";
        String workingText = selectedText.isEmpty() ? context : selectedText;

        String prompt = switch (action.toLowerCase()) {
            case "summarize" -> contextPrefix +
                    "Summarize the following text concisely while preserving key information:\n\n" + workingText;
            case "expand" -> contextPrefix +
                    "Expand on the following text with more detail, examples, and explanations:\n\n" + workingText;
            case "rewrite" -> contextPrefix +
                    "Rewrite the following text to be clearer, more professional, and better structured:\n\n" + workingText;
            case "explain" -> contextPrefix +
                    "Explain the following text in simple terms, as if explaining to someone new to the topic:\n\n" + workingText;
            case "continue" -> contextPrefix +
                    "Continue writing from where the following text left off. " +
                    "Match the style, tone, and topic. Write 2-3 natural paragraphs:\n\n" + workingText;
            case "generate_example" -> contextPrefix +
                    "Generate practical code examples related to the following text. " +
                    "Include well-commented code with explanations. Use markdown formatting:\n\n" + workingText;
            case "add_details" -> contextPrefix +
                    "Add more details, depth, and supporting information to the following text. " +
                    "Include specific facts, examples, and clarifications:\n\n" + workingText;
            case "generate_quiz" -> contextPrefix +
                    "Generate a quiz (5 questions) based on the following text. " +
                    "Include a mix of multiple choice and short answer questions. " +
                    "Provide answers at the end. Use markdown formatting:\n\n" + workingText;
            default -> contextPrefix + "Process the following text:\n\n" + workingText;
        };

        String response = callProvider(user, prompt);
        return AiGenerateResponse.builder()
                .content(response)
                .type("note_assist")
                .build();
    }

    private String callProvider(User user, String prompt) {
        AiSettings settings = settingsService.getOrCreateSettings(user);
        AiProvider provider = providerRegistry.getProvider(settings.getActiveProvider().name());

        String model = switch (settings.getActiveProvider()) {
            case OLLAMA -> settings.getOllamaModel();
            case OPENAI -> settings.getOpenaiModel();
            case GEMINI -> settings.getGeminiModel();
        };

        AiRequest request = AiRequest.builder()
                .systemPrompt("You are an AI assistant integrated into Life OS, a personal productivity application. " +
                        "Provide helpful, accurate, and well-formatted responses.")
                .messages(List.of(AiMessage.builder()
                        .role("user")
                        .content(prompt)
                        .build()))
                .model(model)
                .build();

        String response = provider.complete(request);
        // Strip <think>...</think> tags from models that use chain-of-thought (e.g. qwen3)
        return response.replaceAll("(?s)<think>.*?</think>", "").trim();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
