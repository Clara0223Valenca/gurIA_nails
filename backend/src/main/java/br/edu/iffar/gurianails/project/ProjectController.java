package br.edu.iffar.gurianails.project;

import java.util.List;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private static final Pattern ID_PATTERN = Pattern.compile("[A-Za-z0-9._-]{1,80}");
    private final ProjectRepository repository;
    private final ObjectMapper objectMapper;

    public ProjectController(ProjectRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> list() {
        try {
            List<JsonNode> documents = repository.findAllByOrderByUpdatedAtDesc().stream()
                    .map(ProjectEntity::getDesignJson)
                    .map(this::readProject)
                    .toList();
            return json(objectMapper.writeValueAsString(documents));
        } catch (JacksonException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Um projeto salvo contém JSON inválido.");
        }
    }

    @PostMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> save(@PathVariable String id, @RequestBody String document) {
        if (!ID_PATTERN.matcher(id).matches()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de projeto inválido.");
        if (document == null || document.length() > 18_000_000) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Projeto excede o limite aceito.");
        JsonNode project = readProject(document);
        if (!id.equals(project.path("id").asText())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O identificador não corresponde ao projeto.");
        String name = project.path("name").asText("Meu design").strip();
        if (name.isEmpty()) name = "Meu design";
        if (name.length() > 80) name = name.substring(0, 80);
        boolean favorite = project.path("favorite").asBoolean(false);
        ProjectEntity entity = repository.findById(id).orElse(null);
        if (entity == null) entity = new ProjectEntity(id, name, favorite, document);
        else entity.update(name, favorite, document);
        try {
            return json(objectMapper.writeValueAsString(readProject(repository.save(entity).getDesignJson())));
        } catch (JacksonException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível serializar o projeto salvo.");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!ID_PATTERN.matcher(id).matches()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de projeto inválido.");
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private JsonNode readProject(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node == null || !node.isObject() || !node.path("elements").isArray()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O documento de projeto não é válido.");
            }
            return node;
        } catch (JacksonException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O documento não contém JSON válido.");
        }
    }

    private ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
