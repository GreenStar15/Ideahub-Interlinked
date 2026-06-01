--
-- PostgreSQL database dump
--

\restrict ODdMvDPE9NvU5aX6stKwnVktytjrIjzxsDGPFUP5FCLvElaSYDYNchHPQOf8QGv

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-28 17:04:48

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 273 (class 1255 OID 24866)
-- Name: atualizar_metricas_cache(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.atualizar_metricas_cache() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE metricas_cache SET 
        total_ideias = (SELECT COUNT(*) FROM ideias),
        total_usuarios = (SELECT COUNT(*) FROM usuarios WHERE ativo = true),
        taxa_conversao = (
            SELECT (COUNT(CASE WHEN status = 'convertida' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100
            FROM ideias
        ),
        ultima_atualizacao = NOW();
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.atualizar_metricas_cache() OWNER TO postgres;

--
-- TOC entry 272 (class 1255 OID 16688)
-- Name: atualizar_votos_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.atualizar_votos_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ideias SET votos_count = (
            SELECT COUNT(*) FROM votos WHERE id_ideia = NEW.id_ideia
        ) WHERE id = NEW.id_ideia;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ideias SET votos_count = (
            SELECT COUNT(*) FROM votos WHERE id_ideia = OLD.id_ideia
        ) WHERE id = OLD.id_ideia;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.atualizar_votos_count() OWNER TO postgres;

--
-- TOC entry 274 (class 1255 OID 25156)
-- Name: inserir_notificacao(text, integer, integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.inserir_notificacao(p_mensagem text, p_id_usuario integer, p_id_ideia integer DEFAULT NULL::integer, p_categoria character varying DEFAULT 'geral'::character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO notificacoes (mensagem, id_usuario, id_ideia, categoria, data_envio, lida)
    VALUES (p_mensagem, p_id_usuario, p_id_ideia, p_categoria, NOW(), false);
END;
$$;


ALTER FUNCTION public.inserir_notificacao(p_mensagem text, p_id_usuario integer, p_id_ideia integer, p_categoria character varying) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 268 (class 1259 OID 25093)
-- Name: anexos_comentarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anexos_comentarios (
    id integer NOT NULL,
    id_comentario integer NOT NULL,
    nome_original character varying(255) NOT NULL,
    nome_arquivo character varying(255) NOT NULL,
    tipo_arquivo character varying(100) NOT NULL,
    tamanho integer NOT NULL,
    caminho character varying(500) NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.anexos_comentarios OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 25092)
-- Name: anexos_comentarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.anexos_comentarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anexos_comentarios_id_seq OWNER TO postgres;

--
-- TOC entry 5323 (class 0 OID 0)
-- Dependencies: 267
-- Name: anexos_comentarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.anexos_comentarios_id_seq OWNED BY public.anexos_comentarios.id;


--
-- TOC entry 222 (class 1259 OID 16407)
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    icone character varying(10),
    ativo boolean DEFAULT true,
    ordem integer DEFAULT 0
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16406)
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_seq OWNER TO postgres;

--
-- TOC entry 5324 (class 0 OID 0)
-- Dependencies: 221
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- TOC entry 228 (class 1259 OID 16525)
-- Name: comentarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comentarios (
    id integer NOT NULL,
    texto text NOT NULL,
    data_comentario timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    id_usuario integer NOT NULL,
    id_ideia integer NOT NULL
);


ALTER TABLE public.comentarios OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16524)
-- Name: comentarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comentarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comentarios_id_seq OWNER TO postgres;

--
-- TOC entry 5325 (class 0 OID 0)
-- Dependencies: 227
-- Name: comentarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comentarios_id_seq OWNED BY public.comentarios.id;


--
-- TOC entry 248 (class 1259 OID 24868)
-- Name: conquistas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conquistas (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    descricao text,
    icone character varying(10),
    pontos integer DEFAULT 0,
    tipo character varying(50),
    condicao integer DEFAULT 1,
    ativo boolean DEFAULT true
);


ALTER TABLE public.conquistas OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 24867)
-- Name: conquistas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conquistas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conquistas_id_seq OWNER TO postgres;

--
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 247
-- Name: conquistas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conquistas_id_seq OWNED BY public.conquistas.id;


--
-- TOC entry 244 (class 1259 OID 24825)
-- Name: documentacao_projeto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documentacao_projeto (
    id integer NOT NULL,
    id_projeto integer NOT NULL,
    titulo character varying(200) NOT NULL,
    descricao text,
    versao character varying(20) DEFAULT '1.0'::character varying,
    arquivo_url text,
    data_criacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    criado_por integer,
    data_atualizacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_por integer
);


ALTER TABLE public.documentacao_projeto OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 24824)
-- Name: documentacao_projeto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documentacao_projeto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documentacao_projeto_id_seq OWNER TO postgres;

--
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 243
-- Name: documentacao_projeto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documentacao_projeto_id_seq OWNED BY public.documentacao_projeto.id;


--
-- TOC entry 240 (class 1259 OID 24781)
-- Name: equipamentos_rede; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipamentos_rede (
    id integer NOT NULL,
    id_projeto integer NOT NULL,
    nome character varying(100) NOT NULL,
    tipo character varying(50) NOT NULL,
    fabricante character varying(100),
    modelo character varying(100),
    ip_address character varying(15),
    mascara character varying(15),
    gateway character varying(15),
    custo numeric(10,2) DEFAULT 0,
    observacoes text,
    ordem integer DEFAULT 0,
    data_criacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.equipamentos_rede OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 24780)
-- Name: equipamentos_rede_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipamentos_rede_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipamentos_rede_id_seq OWNER TO postgres;

--
-- TOC entry 5328 (class 0 OID 0)
-- Dependencies: 239
-- Name: equipamentos_rede_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipamentos_rede_id_seq OWNED BY public.equipamentos_rede.id;


--
-- TOC entry 256 (class 1259 OID 24952)
-- Name: historico_pontos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historico_pontos (
    id integer NOT NULL,
    id_usuario integer NOT NULL,
    acao character varying(50) NOT NULL,
    pontos_ganhos integer NOT NULL,
    entidade_id integer,
    data_acao timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.historico_pontos OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 24951)
-- Name: historico_pontos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historico_pontos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historico_pontos_id_seq OWNER TO postgres;

--
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 255
-- Name: historico_pontos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historico_pontos_id_seq OWNED BY public.historico_pontos.id;


--
-- TOC entry 224 (class 1259 OID 16420)
-- Name: ideias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ideias (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    descricao text,
    data_publicacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    id_usuario integer NOT NULL,
    anonima boolean DEFAULT false,
    categoria_id integer,
    status character varying(20) DEFAULT 'pendente'::character varying,
    state character varying(20) DEFAULT 'pendente'::character varying,
    data_aprovacao timestamp with time zone,
    id_projeto integer,
    votos_count integer DEFAULT 0,
    aprovada_por integer,
    visualizacoes integer DEFAULT 0,
    imagem_url text,
    imagem_tipo character varying(20) DEFAULT 'link'::character varying,
    id_local integer,
    id_periodo integer,
    editada_em timestamp without time zone,
    editada_por integer
);


ALTER TABLE public.ideias OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16419)
-- Name: ideias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ideias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ideias_id_seq OWNER TO postgres;

--
-- TOC entry 5330 (class 0 OID 0)
-- Dependencies: 223
-- Name: ideias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ideias_id_seq OWNED BY public.ideias.id;


--
-- TOC entry 238 (class 1259 OID 24731)
-- Name: ideias_imagens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ideias_imagens (
    id integer NOT NULL,
    id_ideia integer NOT NULL,
    imagem_url text NOT NULL,
    ordem integer DEFAULT 0,
    data_upload timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_capa boolean DEFAULT false
);


ALTER TABLE public.ideias_imagens OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 24730)
-- Name: ideias_imagens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ideias_imagens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ideias_imagens_id_seq OWNER TO postgres;

--
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 237
-- Name: ideias_imagens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ideias_imagens_id_seq OWNED BY public.ideias_imagens.id;


--
-- TOC entry 258 (class 1259 OID 24971)
-- Name: locais; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locais (
    id integer NOT NULL,
    nome character varying(200) NOT NULL,
    tipo character varying(50) DEFAULT 'campus'::character varying,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    ativo boolean DEFAULT true,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.locais OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 24970)
-- Name: locais_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.locais_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locais_id_seq OWNER TO postgres;

--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 257
-- Name: locais_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.locais_id_seq OWNED BY public.locais.id;


--
-- TOC entry 232 (class 1259 OID 16640)
-- Name: logs_auditoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logs_auditoria (
    id integer NOT NULL,
    acao character varying(100) NOT NULL,
    descricao text,
    id_usuario integer,
    ip_address character varying(45),
    data_acao timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.logs_auditoria OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16639)
-- Name: logs_auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.logs_auditoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logs_auditoria_id_seq OWNER TO postgres;

--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 231
-- Name: logs_auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.logs_auditoria_id_seq OWNED BY public.logs_auditoria.id;


--
-- TOC entry 242 (class 1259 OID 24804)
-- Name: logs_detalhados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logs_detalhados (
    id integer NOT NULL,
    id_usuario integer NOT NULL,
    acao character varying(100) NOT NULL,
    descricao text,
    ip_address character varying(45),
    user_agent text,
    dados_antes jsonb,
    dados_depois jsonb,
    data_acao timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.logs_detalhados OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 24803)
-- Name: logs_detalhados_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.logs_detalhados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logs_detalhados_id_seq OWNER TO postgres;

--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 241
-- Name: logs_detalhados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.logs_detalhados_id_seq OWNED BY public.logs_detalhados.id;


--
-- TOC entry 246 (class 1259 OID 24855)
-- Name: metricas_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metricas_cache (
    id integer NOT NULL,
    total_ideias integer DEFAULT 0,
    total_usuarios integer DEFAULT 0,
    taxa_conversao numeric(5,2) DEFAULT 0,
    ultima_atualizacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.metricas_cache OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 24854)
-- Name: metricas_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metricas_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metricas_cache_id_seq OWNER TO postgres;

--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 245
-- Name: metricas_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metricas_cache_id_seq OWNED BY public.metricas_cache.id;


--
-- TOC entry 254 (class 1259 OID 24925)
-- Name: notificacoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificacoes (
    id integer NOT NULL,
    mensagem text NOT NULL,
    id_usuario integer NOT NULL,
    id_ideia integer,
    categoria character varying(50) DEFAULT 'geral'::character varying,
    lida boolean DEFAULT false,
    data_envio timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notificacoes OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 25151)
-- Name: notificacoes_backup_20260528; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificacoes_backup_20260528 (
    id integer,
    mensagem text,
    id_usuario integer,
    id_ideia integer,
    categoria character varying(50),
    lida boolean,
    data_envio timestamp with time zone
);


ALTER TABLE public.notificacoes_backup_20260528 OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 24924)
-- Name: notificacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notificacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificacoes_id_seq OWNER TO postgres;

--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 253
-- Name: notificacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notificacoes_id_seq OWNED BY public.notificacoes.id;


--
-- TOC entry 260 (class 1259 OID 24990)
-- Name: periodos_submissao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.periodos_submissao (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    data_inicio date NOT NULL,
    data_fim date NOT NULL,
    ativo boolean DEFAULT true,
    criado_por integer,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.periodos_submissao OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 24989)
-- Name: periodos_submissao_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.periodos_submissao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.periodos_submissao_id_seq OWNER TO postgres;

--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 259
-- Name: periodos_submissao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.periodos_submissao_id_seq OWNED BY public.periodos_submissao.id;


--
-- TOC entry 252 (class 1259 OID 24905)
-- Name: pontuacao_usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pontuacao_usuario (
    id integer NOT NULL,
    id_usuario integer NOT NULL,
    pontos_totais integer DEFAULT 0,
    nivel integer DEFAULT 1,
    data_atualizacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pontuacao_usuario OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 24904)
-- Name: pontuacao_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pontuacao_usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pontuacao_usuario_id_seq OWNER TO postgres;

--
-- TOC entry 5338 (class 0 OID 0)
-- Dependencies: 251
-- Name: pontuacao_usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pontuacao_usuario_id_seq OWNED BY public.pontuacao_usuario.id;


--
-- TOC entry 266 (class 1259 OID 25074)
-- Name: preferencias_notificacoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.preferencias_notificacoes (
    id integer NOT NULL,
    id_usuario integer NOT NULL,
    email_ativado boolean DEFAULT true,
    ultimo_envio timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.preferencias_notificacoes OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 25073)
-- Name: preferencias_notificacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.preferencias_notificacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.preferencias_notificacoes_id_seq OWNER TO postgres;

--
-- TOC entry 5339 (class 0 OID 0)
-- Dependencies: 265
-- Name: preferencias_notificacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.preferencias_notificacoes_id_seq OWNED BY public.preferencias_notificacoes.id;


--
-- TOC entry 230 (class 1259 OID 16549)
-- Name: projetos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projetos (
    id integer NOT NULL,
    nome character varying(200) NOT NULL,
    descricao text,
    responsavel character varying(100),
    data_inicio date,
    prioridade character varying(20) DEFAULT 'media'::character varying,
    status character varying(30) DEFAULT 'planejamento'::character varying,
    data_criacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    id_ideia integer,
    id_responsavel integer,
    deletado boolean DEFAULT false,
    data_delecao timestamp with time zone,
    deletado_por integer
);


ALTER TABLE public.projetos OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16548)
-- Name: projetos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projetos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projetos_id_seq OWNER TO postgres;

--
-- TOC entry 5340 (class 0 OID 0)
-- Dependencies: 229
-- Name: projetos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projetos_id_seq OWNED BY public.projetos.id;


--
-- TOC entry 236 (class 1259 OID 24700)
-- Name: projetos_lixeira; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projetos_lixeira (
    id integer NOT NULL,
    projeto_original_id integer,
    nome character varying(200) NOT NULL,
    descricao text,
    responsavel character varying(100),
    prioridade character varying(20),
    status character varying(30),
    data_criacao timestamp with time zone,
    data_delecao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deletado_por integer
);


ALTER TABLE public.projetos_lixeira OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 24699)
-- Name: projetos_lixeira_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projetos_lixeira_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projetos_lixeira_id_seq OWNER TO postgres;

--
-- TOC entry 5341 (class 0 OID 0)
-- Dependencies: 235
-- Name: projetos_lixeira_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projetos_lixeira_id_seq OWNED BY public.projetos_lixeira.id;


--
-- TOC entry 234 (class 1259 OID 24665)
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    motivo character varying(100) NOT NULL,
    descricao text,
    data_report timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pendente'::character varying,
    id_usuario integer NOT NULL,
    id_ideia integer NOT NULL,
    resolvido_por integer,
    data_resolucao timestamp with time zone,
    justificativa text,
    notificado boolean DEFAULT false
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 25117)
-- Name: reports_comentarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports_comentarios (
    id integer NOT NULL,
    id_comentario integer NOT NULL,
    id_usuario integer NOT NULL,
    motivo character varying(100) NOT NULL,
    descricao text,
    status character varying(20) DEFAULT 'pendente'::character varying,
    data_report timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolvido_por integer,
    data_resolucao timestamp without time zone
);


ALTER TABLE public.reports_comentarios OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 25116)
-- Name: reports_comentarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_comentarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_comentarios_id_seq OWNER TO postgres;

--
-- TOC entry 5342 (class 0 OID 0)
-- Dependencies: 269
-- Name: reports_comentarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_comentarios_id_seq OWNED BY public.reports_comentarios.id;


--
-- TOC entry 233 (class 1259 OID 24664)
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_id_seq OWNER TO postgres;

--
-- TOC entry 5343 (class 0 OID 0)
-- Dependencies: 233
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- TOC entry 262 (class 1259 OID 25013)
-- Name: templates_ideias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.templates_ideias (
    id integer NOT NULL,
    titulo character varying(200) NOT NULL,
    descricao text NOT NULL,
    categoria character varying(50) NOT NULL,
    campos_json jsonb NOT NULL,
    recomendado boolean DEFAULT false,
    ativo boolean DEFAULT true,
    criado_por integer,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total_usos integer DEFAULT 0
);


ALTER TABLE public.templates_ideias OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 25012)
-- Name: templates_ideias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.templates_ideias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.templates_ideias_id_seq OWNER TO postgres;

--
-- TOC entry 5344 (class 0 OID 0)
-- Dependencies: 261
-- Name: templates_ideias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.templates_ideias_id_seq OWNED BY public.templates_ideias.id;


--
-- TOC entry 250 (class 1259 OID 24882)
-- Name: usuario_conquistas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_conquistas (
    id integer NOT NULL,
    id_usuario integer NOT NULL,
    id_conquista integer NOT NULL,
    data_obtencao timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuario_conquistas OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 24881)
-- Name: usuario_conquistas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_conquistas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_conquistas_id_seq OWNER TO postgres;

--
-- TOC entry 5345 (class 0 OID 0)
-- Dependencies: 249
-- Name: usuario_conquistas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_conquistas_id_seq OWNED BY public.usuario_conquistas.id;


--
-- TOC entry 220 (class 1259 OID 16390)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    senha character varying(255) NOT NULL,
    data_cadastro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(20) DEFAULT 'aluno'::character varying,
    ativo boolean DEFAULT true,
    cargo character varying(50) DEFAULT 'aluno'::character varying,
    ultimo_acesso timestamp with time zone,
    criado_por integer,
    total_advertencias integer DEFAULT 0,
    nivel_atual integer DEFAULT 1,
    pontos_totais integer DEFAULT 0,
    ideias_removidas integer DEFAULT 0
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- TOC entry 5346 (class 0 OID 0)
-- Dependencies: 219
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 264 (class 1259 OID 25036)
-- Name: versoes_ideias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.versoes_ideias (
    id integer NOT NULL,
    id_ideia integer NOT NULL,
    titulo character varying(255) NOT NULL,
    descricao text NOT NULL,
    categoria_id integer,
    versao_numero integer NOT NULL,
    alterado_por integer,
    data_alteracao timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.versoes_ideias OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 25035)
-- Name: versoes_ideias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.versoes_ideias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.versoes_ideias_id_seq OWNER TO postgres;

--
-- TOC entry 5347 (class 0 OID 0)
-- Dependencies: 263
-- Name: versoes_ideias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.versoes_ideias_id_seq OWNED BY public.versoes_ideias.id;


--
-- TOC entry 226 (class 1259 OID 16445)
-- Name: votos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.votos (
    id integer NOT NULL,
    id_usuario integer NOT NULL,
    id_ideia integer NOT NULL,
    data_voto timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.votos OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16444)
-- Name: votos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.votos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.votos_id_seq OWNER TO postgres;

--
-- TOC entry 5348 (class 0 OID 0)
-- Dependencies: 225
-- Name: votos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.votos_id_seq OWNED BY public.votos.id;


--
-- TOC entry 4977 (class 2604 OID 25096)
-- Name: anexos_comentarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anexos_comentarios ALTER COLUMN id SET DEFAULT nextval('public.anexos_comentarios_id_seq'::regclass);


--
-- TOC entry 4896 (class 2604 OID 16410)
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- TOC entry 4909 (class 2604 OID 16528)
-- Name: comentarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comentarios ALTER COLUMN id SET DEFAULT nextval('public.comentarios_id_seq'::regclass);


--
-- TOC entry 4943 (class 2604 OID 24871)
-- Name: conquistas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conquistas ALTER COLUMN id SET DEFAULT nextval('public.conquistas_id_seq'::regclass);


--
-- TOC entry 4934 (class 2604 OID 24828)
-- Name: documentacao_projeto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentacao_projeto ALTER COLUMN id SET DEFAULT nextval('public.documentacao_projeto_id_seq'::regclass);


--
-- TOC entry 4928 (class 2604 OID 24784)
-- Name: equipamentos_rede id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipamentos_rede ALTER COLUMN id SET DEFAULT nextval('public.equipamentos_rede_id_seq'::regclass);


--
-- TOC entry 4957 (class 2604 OID 24955)
-- Name: historico_pontos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_pontos ALTER COLUMN id SET DEFAULT nextval('public.historico_pontos_id_seq'::regclass);


--
-- TOC entry 4899 (class 2604 OID 16423)
-- Name: ideias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias ALTER COLUMN id SET DEFAULT nextval('public.ideias_id_seq'::regclass);


--
-- TOC entry 4924 (class 2604 OID 24734)
-- Name: ideias_imagens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias_imagens ALTER COLUMN id SET DEFAULT nextval('public.ideias_imagens_id_seq'::regclass);


--
-- TOC entry 4959 (class 2604 OID 24974)
-- Name: locais id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locais ALTER COLUMN id SET DEFAULT nextval('public.locais_id_seq'::regclass);


--
-- TOC entry 4916 (class 2604 OID 16643)
-- Name: logs_auditoria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs_auditoria ALTER COLUMN id SET DEFAULT nextval('public.logs_auditoria_id_seq'::regclass);


--
-- TOC entry 4932 (class 2604 OID 24807)
-- Name: logs_detalhados id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs_detalhados ALTER COLUMN id SET DEFAULT nextval('public.logs_detalhados_id_seq'::regclass);


--
-- TOC entry 4938 (class 2604 OID 24858)
-- Name: metricas_cache id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metricas_cache ALTER COLUMN id SET DEFAULT nextval('public.metricas_cache_id_seq'::regclass);


--
-- TOC entry 4953 (class 2604 OID 24928)
-- Name: notificacoes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes ALTER COLUMN id SET DEFAULT nextval('public.notificacoes_id_seq'::regclass);


--
-- TOC entry 4963 (class 2604 OID 24993)
-- Name: periodos_submissao id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.periodos_submissao ALTER COLUMN id SET DEFAULT nextval('public.periodos_submissao_id_seq'::regclass);


--
-- TOC entry 4949 (class 2604 OID 24908)
-- Name: pontuacao_usuario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pontuacao_usuario ALTER COLUMN id SET DEFAULT nextval('public.pontuacao_usuario_id_seq'::regclass);


--
-- TOC entry 4973 (class 2604 OID 25077)
-- Name: preferencias_notificacoes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preferencias_notificacoes ALTER COLUMN id SET DEFAULT nextval('public.preferencias_notificacoes_id_seq'::regclass);


--
-- TOC entry 4911 (class 2604 OID 16552)
-- Name: projetos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos ALTER COLUMN id SET DEFAULT nextval('public.projetos_id_seq'::regclass);


--
-- TOC entry 4922 (class 2604 OID 24703)
-- Name: projetos_lixeira id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos_lixeira ALTER COLUMN id SET DEFAULT nextval('public.projetos_lixeira_id_seq'::regclass);


--
-- TOC entry 4918 (class 2604 OID 24668)
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- TOC entry 4979 (class 2604 OID 25120)
-- Name: reports_comentarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports_comentarios ALTER COLUMN id SET DEFAULT nextval('public.reports_comentarios_id_seq'::regclass);


--
-- TOC entry 4966 (class 2604 OID 25016)
-- Name: templates_ideias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates_ideias ALTER COLUMN id SET DEFAULT nextval('public.templates_ideias_id_seq'::regclass);


--
-- TOC entry 4947 (class 2604 OID 24885)
-- Name: usuario_conquistas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_conquistas ALTER COLUMN id SET DEFAULT nextval('public.usuario_conquistas_id_seq'::regclass);


--
-- TOC entry 4887 (class 2604 OID 16393)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- TOC entry 4971 (class 2604 OID 25039)
-- Name: versoes_ideias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versoes_ideias ALTER COLUMN id SET DEFAULT nextval('public.versoes_ideias_id_seq'::regclass);


--
-- TOC entry 4907 (class 2604 OID 16448)
-- Name: votos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votos ALTER COLUMN id SET DEFAULT nextval('public.votos_id_seq'::regclass);


--
-- TOC entry 5314 (class 0 OID 25093)
-- Dependencies: 268
-- Data for Name: anexos_comentarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.anexos_comentarios (id, id_comentario, nome_original, nome_arquivo, tipo_arquivo, tamanho, caminho, criado_em) FROM stdin;
\.


--
-- TOC entry 5268 (class 0 OID 16407)
-- Dependencies: 222
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias (id, nome, icone, ativo, ordem) FROM stdin;
2	Tecnologia e Inovação	💻	t	2
3	Ensino e Metodologia	📚	t	3
4	Bem-estar e Saúde	❤️	t	4
5	Cultura e Eventos	🎭	t	5
1	Infraestrutura	🏛️	t	1
11	Sustentabilidade	🌱	t	6
13	Gestão e Administração	📊	t	8
15	Laboratórios e Pesquisa	🔬	t	10
16	Acessibilidade e Inclusão	♿	t	11
17	Alimentação e RU	🍽️	t	12
18	Transporte e Mobilidade	🚌	t	13
19	Segurança	🛡️	t	14
\.


--
-- TOC entry 5274 (class 0 OID 16525)
-- Dependencies: 228
-- Data for Name: comentarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comentarios (id, texto, data_comentario, id_usuario, id_ideia) FROM stdin;
16	Sou da área de TI e posso ajudar no desenvolvimento.	2026-04-23 14:03:53.433754-03	1	76
18	Concordo, o atendimento precisa melhorar urgentemente.	2026-04-23 14:03:53.433754-03	3	81
20	Adorei a ideia! Poderia ter também uma feira de artesanato.	2026-04-23 14:03:53.433754-03	4	88
22	Sou o homem teste!!!	2026-04-30 15:37:09.586005-03	10	79
23	Sou o homem teste!!!	2026-04-30 15:37:17.042244-03	10	87
24	Sou o homem teste!!!	2026-04-30 15:37:22.744028-03	10	88
27	Sou o homem teste!!!	2026-04-30 15:37:46.924875-03	10	83
28	Sou o homem teste!!!	2026-04-30 15:37:51.968457-03	10	85
29	Sou o homem teste!!!	2026-04-30 15:37:57.318008-03	10	80
30	Sou o homem teste!!!	2026-04-30 15:38:05.599696-03	10	75
31	Que ideia maneira!	2026-05-05 10:09:30.139957-03	1	86
33	teste	2026-05-28 08:46:20.970712-03	5	108
\.


--
-- TOC entry 5294 (class 0 OID 24868)
-- Dependencies: 248
-- Data for Name: conquistas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conquistas (id, nome, descricao, icone, pontos, tipo, condicao, ativo) FROM stdin;
22	Primeira Ideia	Criou sua primeira ideia	✨	10	criar_ideia	1	t
23	Mestre das Ideias	Criou 10 ideias	🏆	50	criar_ideia	10	t
24	Ideia Implementada	Teve uma ideia convertida em projeto	🚀	100	ideia_convertida	1	t
25	Votador Ativo	Votou em 20 ideias	🗳️	30	votar	20	t
26	Comunicador	Fez 10 comentários	💬	20	comentar	10	t
27	Inovador Nato	Teve 5 ideias convertidas	🌟	200	ideia_convertida	5	t
28	Comunidade Engajada	Participou em 50 votos	🤝	100	votar	50	t
\.


--
-- TOC entry 5290 (class 0 OID 24825)
-- Dependencies: 244
-- Data for Name: documentacao_projeto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documentacao_projeto (id, id_projeto, titulo, descricao, versao, arquivo_url, data_criacao, criado_por, data_atualizacao, atualizado_por) FROM stdin;
1	6	Documento Exemplo	Este é um documento de exemplo	1.0	\N	2026-04-16 18:04:12.047757-03	1	2026-04-16 18:04:12.047757-03	\N
2	10	Sprint Splendi	asd	1.0	/uploads/documentos/doc-1776374075844-689100683.docx	2026-04-16 18:05:01.582968-03	5	2026-04-16 18:14:36.681172-03	5
3	11	te	te	1.0	\N	2026-04-16 21:15:57.205198-03	5	2026-04-16 21:15:57.205198-03	\N
4	11	te	te	1.0	/uploads/documentos/doc-1776384957141-987566648.docx	2026-04-16 21:15:57.210188-03	5	2026-04-16 21:15:57.210188-03	\N
\.


--
-- TOC entry 5286 (class 0 OID 24781)
-- Dependencies: 240
-- Data for Name: equipamentos_rede; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipamentos_rede (id, id_projeto, nome, tipo, fabricante, modelo, ip_address, mascara, gateway, custo, observacoes, ordem, data_criacao) FROM stdin;
3	10	Roteador faltando ali perto do Bloco X	roteador						1500.00		\N	2026-04-16 10:35:21.273-03
4	11	cabo azul	roteador	oi	wifi 6				160.00	na oi ta esse preço	0	2026-04-16 21:17:11.841847-03
\.


--
-- TOC entry 5302 (class 0 OID 24952)
-- Dependencies: 256
-- Data for Name: historico_pontos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historico_pontos (id, id_usuario, acao, pontos_ganhos, entidade_id, data_acao) FROM stdin;
1	1	comentar	2	86	2026-05-05 10:09:30.147468
2	1	comentar	2	99	2026-05-05 10:55:25.139978
3	5	criar_ideia	10	101	2026-05-07 11:07:20.686139
4	5	criar_ideia	10	102	2026-05-07 11:13:49.930883
5	5	criar_ideia	10	103	2026-05-07 11:14:03.766547
6	5	criar_ideia	10	104	2026-05-07 11:22:31.533247
7	5	criar_ideia	10	105	2026-05-07 11:38:20.175012
8	5	criar_ideia	10	106	2026-05-07 11:38:53.940042
9	5	criar_ideia	10	107	2026-05-14 09:38:01.132155
10	5	criar_ideia	10	108	2026-05-14 09:51:47.238523
11	5	comentar	2	108	2026-05-28 08:46:20.974928
12	5	comentar	2	82	2026-05-28 08:55:14.070806
13	5	comentar	2	82	2026-05-28 08:55:23.873651
14	5	comentar	2	82	2026-05-28 08:55:39.546584
15	5	comentar	2	82	2026-05-28 09:05:34.014277
16	1	comentar	2	82	2026-05-28 11:44:22.120476
17	1	comentar	2	82	2026-05-28 11:44:24.463465
18	1	comentar	2	82	2026-05-28 11:44:32.887781
19	1	comentar	2	82	2026-05-28 11:44:47.743046
20	1	votar	2	83	2026-05-28 12:07:35.36893
21	5	receber_voto	1	83	2026-05-28 12:07:35.374402
22	1	votar	2	83	2026-05-28 12:07:36.947979
23	5	receber_voto	1	83	2026-05-28 12:07:36.95059
24	1	votar	2	83	2026-05-28 12:07:40.027837
25	5	receber_voto	1	83	2026-05-28 12:07:40.030172
26	1	votar	2	83	2026-05-28 12:07:44.093641
27	5	receber_voto	1	83	2026-05-28 12:07:44.096243
28	1	votar	2	83	2026-05-28 12:07:49.032694
29	5	receber_voto	1	83	2026-05-28 12:07:49.034628
30	1	votar	2	83	2026-05-28 12:09:47.250546
31	5	receber_voto	1	83	2026-05-28 12:09:47.256755
32	1	votar	2	83	2026-05-28 12:11:18.491124
33	5	receber_voto	1	83	2026-05-28 12:11:18.495949
34	1	votar	2	83	2026-05-28 12:11:20.766576
35	5	receber_voto	1	83	2026-05-28 12:11:20.768407
36	1	votar	2	83	2026-05-28 12:11:28.879749
37	5	receber_voto	1	83	2026-05-28 12:11:28.882639
38	1	votar	2	83	2026-05-28 12:11:30.316749
39	5	receber_voto	1	83	2026-05-28 12:11:30.319288
40	1	votar	2	83	2026-05-28 12:11:31.46643
41	5	receber_voto	1	83	2026-05-28 12:11:31.468935
42	1	votar	2	83	2026-05-28 12:14:55.404359
43	5	receber_voto	1	83	2026-05-28 12:14:55.425747
44	1	votar	2	83	2026-05-28 12:14:59.63252
45	5	receber_voto	1	83	2026-05-28 12:14:59.634655
46	1	votar	2	83	2026-05-28 12:15:00.584209
47	5	receber_voto	1	83	2026-05-28 12:15:00.58586
48	1	votar	2	83	2026-05-28 12:15:34.155793
49	5	receber_voto	1	83	2026-05-28 12:15:34.163312
50	1	votar	2	83	2026-05-28 12:15:35.482667
51	5	receber_voto	1	83	2026-05-28 12:15:35.484763
52	1	votar	2	83	2026-05-28 12:15:37.894037
53	5	receber_voto	1	83	2026-05-28 12:15:37.896561
54	1	votar	2	83	2026-05-28 12:15:41.667012
55	5	receber_voto	1	83	2026-05-28 12:15:41.668411
56	1	votar	2	83	2026-05-28 12:15:46.037343
57	5	receber_voto	1	83	2026-05-28 12:15:46.039161
58	1	votar	2	83	2026-05-28 12:15:48.648694
59	5	receber_voto	1	83	2026-05-28 12:15:48.650073
60	1	votar	2	83	2026-05-28 12:16:00.817828
61	5	receber_voto	1	83	2026-05-28 12:16:00.823956
62	1	votar	2	83	2026-05-28 12:16:03.577564
63	5	receber_voto	1	83	2026-05-28 12:16:03.579191
64	1	votar	2	83	2026-05-28 12:16:05.131203
65	5	receber_voto	1	83	2026-05-28 12:16:05.133878
66	1	votar	2	83	2026-05-28 12:16:09.614133
67	5	receber_voto	1	83	2026-05-28 12:16:09.616692
68	1	votar	2	83	2026-05-28 12:16:23.89833
69	5	receber_voto	1	83	2026-05-28 12:16:23.902963
70	1	votar	2	83	2026-05-28 12:16:46.969226
71	5	receber_voto	1	83	2026-05-28 12:16:46.973976
72	1	votar	2	\N	2026-05-28 13:49:56.310701
73	5	criar_ideia	10	144	2026-05-28 15:44:22.539556
74	5	criar_ideia	10	145	2026-05-28 15:44:23.213463
\.


--
-- TOC entry 5270 (class 0 OID 16420)
-- Dependencies: 224
-- Data for Name: ideias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ideias (id, titulo, descricao, data_publicacao, id_usuario, anonima, categoria_id, status, state, data_aprovacao, id_projeto, votos_count, aprovada_por, visualizacoes, imagem_url, imagem_tipo, id_local, id_periodo, editada_em, editada_por) FROM stdin;
81	Reclamação sobre o atendimento	O atendimento na secretaria é péssimo e a comida do RU é horrível. Nunca resolvem nada. Isso é um absurdo total e vou processar a instituição.	2026-04-23 14:02:33.70488-03	4	f	13	pendente	pendente	\N	\N	1	\N	43	\N	link	2	\N	\N	\N
88	Festival de Talentos da Universidade	Organizar um festival anual de talentos onde alunos podem se apresentar (música, dança, teatro, poesia) e ganhar prêmios.	2026-04-23 14:02:33.70488-03	3	f	5	pendente	pendente	\N	\N	1	\N	5	\N	link	1	\N	\N	\N
91	teste	teste	2026-04-30 15:35:52.229961-03	10	f	2	pendente	pendente	\N	\N	0	\N	2	\N	link	4	\N	\N	\N
86	App de Acessibilidade para Deficientes Visuais	Desenvolver um aplicativo que auxilia alunos com deficiência visual a navegar pelo campus, com orientações por voz e alertas de obstáculos.	2026-04-23 14:02:33.70488-03	5	f	16	pendente	pendente	\N	\N	2	\N	16	\N	link	3	\N	\N	\N
75	Portal de Estágios Unificado	Criar uma plataforma que integre todas as oportunidades de estágio da região, com filtros por curso, período e habilidades. Incluiria também preparação para entrevistas e currículo integrado.	2026-04-23 14:02:33.70488-03	1	f	13	aprovada	pendente	\N	\N	4	\N	10	\N	link	4	\N	\N	\N
85	Câmeras nos Estacionamentos	Instalar câmeras de segurança nos estacionamentos para inibir furtos e aumentar a segurança dos alunos e funcionários.	2026-04-23 14:02:33.70488-03	3	f	19	pendente	pendente	\N	\N	1	\N	3	\N	link	2	\N	\N	\N
109	Plataforma de Gestão de TCCs Integrada	Desenvolver uma plataforma web que integre alunos, orientadores e coordenação para gerenciar todo o fluxo dos Trabalhos de Conclusão de Curso, com cronogramas, notificações e versionamento de documentos.	2026-04-13 15:42:57.746946-03	1	f	13	aprovada	pendente	\N	\N	0	\N	45	\N	link	1	\N	\N	\N
110	Aplicativo de Caronas Solidárias	Criar um app para conectar estudantes que moram na mesma região para compartilhar caronas, reduzindo custos e emissão de carbono. Com sistema de avaliação e geolocalização.	2026-04-18 15:42:57.746946-03	2	f	18	aprovada	pendente	\N	\N	0	\N	67	\N	link	2	\N	\N	\N
111	Laboratório Maker de Baixo Custo	Implementar um laboratório maker utilizando materiais recicláveis e impressoras 3D de baixo custo para incentivar a prototipagem de projetos inovadores.	2026-04-20 15:42:57.746946-03	3	f	15	aprovada	pendente	\N	\N	0	\N	89	\N	link	3	\N	\N	\N
112	Sistema de Recomendação de Disciplinas	Usar inteligência artificial para recomendar disciplinas optativas baseadas no perfil e histórico do aluno, facilitando a montagem de grade curricular.	2026-04-23 15:42:57.746946-03	4	f	2	aprovada	pendente	\N	\N	0	\N	34	\N	link	4	\N	\N	\N
113	Horta Comunitária Vertical	Aproveitar espaços ociosos da universidade para criar hortas verticais, produzindo alimentos orgânicos para o RU e promovendo sustentabilidade.	2026-04-26 15:42:57.746946-03	5	f	11	aprovada	pendente	\N	\N	0	\N	78	\N	link	5	\N	\N	\N
114	Chatbot para Atendimento Acadêmico	Desenvolver um chatbot inteligente para responder dúvidas frequentes de alunos sobre matrícula, calendário acadêmico, biblioteca e serviços.	2026-04-28 15:42:57.746946-03	10	f	2	aprovada	pendente	\N	\N	0	\N	123	\N	link	6	\N	\N	\N
76	Laboratório de Realidade Virtual	Implementar um laboratório de realidade virtual para aulas práticas de medicina, engenharia e arquitetura. Os alunos poderiam simular procedimentos e visualizar projetos em 3D.	2026-04-23 14:02:33.70488-03	2	f	15	pendente	pendente	\N	\N	5	\N	17	\N	link	1	\N	\N	\N
115	Programa de Mentoria entre Alunos	Criar um programa onde alunos veteranos mentoram calouros, ajudando na adaptação à universidade e compartilhando experiências acadêmicas.	2026-04-30 15:42:57.746946-03	1	f	3	aprovada	pendente	\N	\N	0	\N	56	\N	link	7	\N	\N	\N
116	App de Monitoramento de Saúde Mental	Aplicativo para alunos e professores monitorarem sua saúde mental, com dicas de bem-estar, exercícios de respiração e encaminhamento para apoio psicológico.	2026-05-03 15:42:57.746946-03	2	f	4	aprovada	pendente	\N	\N	0	\N	92	\N	link	8	\N	\N	\N
117	Sistema de Empréstimo de Equipamentos	Plataforma para gerenciar empréstimo de notebooks, calculadoras, livros e equipamentos de laboratório, com notificações de vencimento e multas.	2026-05-06 15:42:57.746946-03	3	f	1	aprovada	pendente	\N	\N	0	\N	41	\N	link	9	\N	\N	\N
79	Sistema de Mentorias entre Alunos	Criar um programa onde alunos mais experientes ajudam calouros com dificuldades em matérias específicas. Os mentores poderiam ganhar horas complementares.	2026-04-23 14:02:33.70488-03	3	f	3	pendente	pendente	\N	\N	1	\N	2	\N	link	4	\N	\N	\N
87	Programa de Saúde Mental	Criar um programa de apoio psicológico gratuito para alunos, com atendimentos online e presenciais, além de grupos de apoio.	2026-04-23 14:02:33.70488-03	2	t	4	pendente	pendente	\N	\N	1	\N	3	\N	link	4	\N	\N	\N
80	Aplicativo de Cardápio do RU	Desenvolver um app que mostre o cardápio do RU diariamente, com opções vegetarianas, veganas e sem glúten destacadas. Também permitiria avaliação das refeições.	2026-04-23 14:02:33.70488-03	4	t	17	pendente	pendente	\N	\N	1	\N	14	\N	link	1	\N	\N	\N
84	Coleta Seletiva no Campus	Implementar coleta seletiva em todo o campus com lixeiras coloridas e campanhas de conscientização. Parceria com cooperativa de reciclagem local.	2026-04-23 14:02:33.70488-03	2	f	11	pendente	pendente	\N	\N	1	\N	1	\N	link	1	\N	\N	\N
118	Ciclovia Interna no Campus	Projeto de infraestrutura para implantar ciclovias internas no campus, conectando todos os blocos e incentivando o uso de bicicletas como meio de transporte.	2026-05-08 15:42:57.746946-03	4	f	18	aprovada	pendente	\N	\N	0	\N	67	\N	link	1	\N	\N	\N
119	Repositório Institucional de Trabalhos	Criar um repositório digital para armazenar e divulgar TCCs, artigos e projetos de pesquisa da instituição, com busca avançada e métricas de impacto.	2026-05-10 15:42:57.746946-03	5	f	15	aprovada	pendente	\N	\N	0	\N	88	\N	link	2	\N	\N	\N
120	Gamificação no Ensino de Programação	Utilizar elementos de jogos (pontos, badges, rankings) para engajar alunos nas disciplinas de programação, reduzindo a evasão.	2026-05-12 15:42:57.746946-03	10	f	3	aprovada	pendente	\N	\N	0	\N	134	\N	link	3	\N	\N	\N
78	Melhorias na Área de Convivência	Sugiro adicionar mais mesas e tomadas na área de convivência, além de bebedouros com água gelada. Também seria bom ter um espaço de jogos e lazer para os intervalos.	2026-04-23 14:02:33.70488-03	3	f	1	pendente	pendente	\N	\N	1	\N	1	\N	link	3	\N	\N	\N
108	Proposta de Expansão de Wi-Fi 3.0	*Problema identificado:* Descreva as áreas com sinal fraco ou ausente...\n*Solução proposta:* Ex: instalação de novos access points, upgrade de equipamentos...\n*Público-alvo:* Alunos, professores, laboratórios, salas específicas...\n*Recursos necessários:* Equipamentos, orçamento, mão de obra...\n3.0	2026-05-14 09:51:47.153523-03	5	f	4	pendente	pendente	\N	\N	0	\N	39	\N	link	\N	\N	2026-05-20 11:09:55.887968	5
121	Sistema de Reserva de Salas Inteligente	Aplicativo para reservar salas de estudo e laboratórios com confirmação automática, integrado ao calendário acadêmico.	2026-05-14 15:42:57.746946-03	1	f	1	aprovada	pendente	\N	\N	0	\N	72	\N	link	4	\N	\N	\N
122	Feira de Inovação e Empreendedorismo	Organizar um evento anual onde alunos possam apresentar projetos inovadores para investidores e empresas parceiras.	2026-05-16 15:42:57.746946-03	2	f	5	aprovada	pendente	\N	\N	0	\N	56	\N	link	5	\N	\N	\N
123	Aplicativo de Acessibilidade para Deficientes Visuais	Desenvolver um app com navegação por voz e descrição de ambientes para auxiliar alunos com deficiência visual no campus.	2026-05-18 15:42:57.746946-03	3	f	16	aprovada	pendente	\N	\N	0	\N	103	\N	link	6	\N	\N	\N
124	Programa de Coleta Seletiva Inteligente	Implementar lixeiras com sensores de capacidade e sistema de recompensas para incentivar a reciclagem no campus.	2026-05-19 15:42:57.746946-03	4	f	11	aprovada	pendente	\N	\N	0	\N	67	\N	link	7	\N	\N	\N
125	Plataforma de Estágios e Oportunidades	Site que conecta alunos a vagas de estágio, empregos e projetos de extensão, com filtros por curso e habilidades.	2026-05-20 15:42:57.746946-03	5	f	13	aprovada	pendente	\N	\N	0	\N	112	\N	link	8	\N	\N	\N
126	Laboratório de Idiomas Online	Plataforma gratuita para prática de idiomas com conversação entre alunos e materiais interativos.	2026-05-21 15:42:57.746946-03	10	f	3	aprovada	pendente	\N	\N	0	\N	45	\N	link	9	\N	\N	\N
127	Sistema de Avaliação de Professores por Alunos	Aplicativo anônimo para alunos avaliarem disciplinas e professores, gerando relatórios para melhoria contínua.	2026-05-22 15:42:57.746946-03	1	f	13	aprovada	pendente	\N	\N	0	\N	89	\N	link	1	\N	\N	\N
128	Evento de Hackathon Social	Promover um hackathon focado em soluções tecnológicas para problemas sociais da comunidade local.	2026-05-23 15:42:57.746946-03	2	f	5	aprovada	pendente	\N	\N	0	\N	78	\N	link	2	\N	\N	\N
129	Aplicativo de Cardápio do RU	App que mostra cardápio diário do Restaurante Universitário, com alertas de alergênicos e avaliação das refeições.	2026-05-24 15:42:57.746946-03	3	f	17	aprovada	pendente	\N	\N	0	\N	156	\N	link	3	\N	\N	\N
130	Sistema de Monitoramento de Energia	Instalar sensores e criar dashboard para monitorar consumo de energia dos laboratórios e salas, identificando desperdícios.	2026-05-25 15:42:57.746946-03	4	f	11	aprovada	pendente	\N	\N	0	\N	34	\N	link	4	\N	\N	\N
131	Clube de Leitura e Literatura	Criar um clube de leitura mensal com encontros presenciais e online, incentivando a leitura entre os alunos.	2026-05-25 15:42:57.746946-03	5	f	5	aprovada	pendente	\N	\N	0	\N	45	\N	link	5	\N	\N	\N
132	Aplicativo de Segurança no Campus	Botão de pânico integrado ao mapa do campus, com localização em tempo real e acionamento da segurança.	2026-05-26 15:42:57.746946-03	10	f	19	aprovada	pendente	\N	\N	0	\N	234	\N	link	6	\N	\N	\N
134	Espaço de Convivência e Lazer	Criar áreas de convivência com jogos, poltronas confortáveis e tomadas para recarga de dispositivos.	2026-05-27 15:42:57.746946-03	2	f	1	aprovada	pendente	\N	\N	0	\N	89	\N	link	8	\N	\N	\N
135	Sistema de Gestão de Projetos de Extensão	Plataforma para gerenciar projetos de extensão universitária, com cronogramas, equipes e relatórios de impacto.	2026-05-27 15:42:57.746946-03	3	f	13	aprovada	pendente	\N	\N	0	\N	34	\N	link	9	\N	\N	\N
136	Aplicativo de Transporte Solidário	App para organizar fretados colaborativos entre alunos que moram em bairros distantes.	2026-05-28 15:42:57.746946-03	4	f	18	pendente	pendente	\N	\N	0	\N	12	\N	link	1	\N	\N	\N
137	Biblioteca de Jogos Educativos	Coleção de jogos de tabuleiro e digitais com foco educacional para empréstimo aos alunos.	2026-05-28 15:42:57.746946-03	5	f	3	pendente	pendente	\N	\N	0	\N	23	\N	link	2	\N	\N	\N
138	Projeto de Energia Solar nos Prédios	Implantar painéis solares nos telhados dos blocos para reduzir custos com energia elétrica.	2026-05-28 15:42:57.746946-03	10	f	11	pendente	pendente	\N	\N	0	\N	45	\N	link	3	\N	\N	\N
139	App de Notificações de Eventos Acadêmicos	Aplicativo que envia push notifications sobre palestras, workshops e eventos importantes na universidade.	2026-05-28 15:42:57.746946-03	1	f	5	pendente	pendente	\N	\N	0	\N	34	\N	link	4	\N	\N	\N
140	Programa de Intercâmbio Virtual	Plataforma para conectar alunos com universidades estrangeiras para intercâmbios online e projetos colaborativos.	2026-05-28 15:42:57.746946-03	2	f	2	pendente	pendente	\N	\N	0	\N	56	\N	link	5	\N	\N	\N
141	Sistema de Compartilhamento de Materiais	Aplicativo onde alunos podem doar ou trocar livros, aparelhos eletrônicos e materiais de estudo.	2026-05-28 15:42:57.746946-03	3	f	17	pendente	pendente	\N	\N	0	\N	89	\N	link	6	\N	\N	\N
142	Rádio Web Universitária	Criar uma rádio online gerenciada por alunos, com programação cultural, musical e entrevistas.	2026-05-28 15:42:57.746946-03	4	f	5	pendente	pendente	\N	\N	0	\N	67	\N	link	7	\N	\N	\N
143	Sistema de Vacinação no Campus	Organizar campanhas de vacinação contra gripe e outras doenças no campus universitário.	2026-05-28 15:42:57.746946-03	5	f	4	pendente	pendente	\N	\N	0	\N	123	\N	link	8	\N	\N	\N
145	Teste	teste	2026-05-28 15:44:23.211903-03	5	f	2	pendente	pendente	\N	\N	0	\N	1	\N	link	1	\N	\N	\N
133	Programa de Capacitação em TI para Professores	Oferecer cursos e workshops para professores se atualizarem em tecnologias educacionais e ferramentas digitais.	2026-05-26 15:42:57.746946-03	1	f	3	aprovada	pendente	\N	\N	0	\N	69	\N	link	7	\N	\N	\N
82	Biblioteca Virtual com Acervo Digital	Implementar uma biblioteca virtual com acesso a livros, artigos e periódicos online. Incluiria também um sistema de empréstimo de e-books e audiobooks.	2026-04-23 14:02:33.70488-03	5	f	2	aprovada	pendente	\N	\N	5	\N	68	\N	link	3	\N	\N	\N
83	Hub de Inovação e Empreendedorismo	Criar um espaço dedicado a startups e projetos de inovação, com mentoria, networking e possibilidade de conexão com investidores. Incluiria workshops e hackathons.	2026-04-23 14:02:33.70488-03	5	f	2	aprovada	pendente	\N	\N	4	\N	21	\N	link	4	\N	\N	\N
\.


--
-- TOC entry 5284 (class 0 OID 24731)
-- Dependencies: 238
-- Data for Name: ideias_imagens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ideias_imagens (id, id_ideia, imagem_url, ordem, data_upload, is_capa) FROM stdin;
27	145	/uploads/885bbfcd-667a-4e93-a5b1-0224245931c0.png	0	2026-05-28 15:44:23.211903-03	t
\.


--
-- TOC entry 5304 (class 0 OID 24971)
-- Dependencies: 258
-- Data for Name: locais; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.locais (id, nome, tipo, latitude, longitude, ativo, criado_em) FROM stdin;
1	Bloco 1	predio	-25.42604800	-49.21428200	t	2026-05-07 09:42:34.589286
2	Bloco 2	predio	-25.42577400	-49.21291600	t	2026-05-07 09:42:34.589286
3	Bloco 3	predio	-25.42533000	-49.21263200	t	2026-05-07 09:42:34.589286
4	Bloco 4	predio	-25.42517400	-49.21223800	t	2026-05-07 09:42:34.589286
5	Bloco 5	predio	-25.42504700	-49.21184500	t	2026-05-07 10:21:59.552041
6	Bloco 6	predio	-25.42451200	-49.21028400	t	2026-05-07 10:21:59.552041
7	Bloco 7	predio	-25.42458100	-49.21308800	t	2026-05-07 10:21:59.552041
8	Bloco 8	predio	-25.42401700	-49.21292000	t	2026-05-07 10:21:59.552041
9	Bloco 9	predio	-25.42370100	-49.21154800	t	2026-05-07 10:21:59.552041
\.


--
-- TOC entry 5278 (class 0 OID 16640)
-- Dependencies: 232
-- Data for Name: logs_auditoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.logs_auditoria (id, acao, descricao, id_usuario, ip_address, data_acao) FROM stdin;
1	exclusao_permanente	Projeto "Botar a ideia ABRIL pra ir né!" permanentemente excluído	5	\N	2026-04-09 13:32:17.617768-03
2	exclusao_permanente	Projeto "So com vodka" permanentemente excluído	5	\N	2026-04-09 13:37:40.474395-03
3	moderacao	Ideia "Tacar molotov na alemanha" - Advertida - Motivo: discurso_odio	5	\N	2026-04-09 16:59:08.394472-03
4	moderacao	Ideia "Tacar molotov na alemanha" - Advertida - Motivo: discurso_odio	5	\N	2026-04-09 17:08:30.190093-03
5	moderacao	Ideia "Tacar molotov na alemanha" - Advertida - Motivo: discurso_odio	5	\N	2026-04-09 17:11:36.417835-03
6	moderacao	Ideia "Tacar molotov na alemanha" - Advertida - Motivo: spam	5	\N	2026-04-09 17:12:58.140779-03
7	moderacao	Ideia "Tacar molotov na alemanha" - Advertida - Motivo: discurso_odio	5	\N	2026-04-09 17:14:10.743521-03
8	moderacao	Ideia "Ideia Antiga - Fevereiro" - Advertida - Motivo: spam	1	\N	2026-04-09 17:20:32.878149-03
9	moderacao	Ideia "Tacar molotov na alemanha" - Advertida - Motivo: discurso_odio	5	\N	2026-04-09 17:20:59.251991-03
10	moderacao	Ideia "Tacar molotov na alemanha" - Advertida - Motivo: discurso_odio	5	\N	2026-04-09 17:22:38.717992-03
11	moderacao	Ideia "Tacar molotov na alemanha" - Advertida - Motivo: spam	5	\N	2026-04-09 17:23:38.693352-03
12	moderacao	Ideia "Tacar molotov na alemanha" - Advertida - Motivo: discurso_odio	5	\N	2026-04-09 17:26:23.337255-03
13	moderacao	Ideia "Ideia Antiga - Fevereiro" - Advertida - Motivo: spam	1	\N	2026-04-09 17:29:04.774268-03
14	reset_advertencias	Advertências do usuário 1 resetadas	5	\N	2026-04-09 17:39:10.821797-03
15	reset_advertencias	Advertências do usuário 1 resetadas	5	\N	2026-04-16 21:09:57.418262-03
16	reset_advertencias	Advertências do usuário 4 resetadas	2	\N	2026-04-23 14:34:38.075598-03
17	reset_advertencias	Advertências do usuário 1 resetadas	2	\N	2026-04-23 14:34:40.621492-03
18	reset_advertencias	Advertências do usuário 5 resetadas	2	\N	2026-04-23 14:34:43.813501-03
\.


--
-- TOC entry 5288 (class 0 OID 24804)
-- Dependencies: 242
-- Data for Name: logs_detalhados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.logs_detalhados (id, id_usuario, acao, descricao, ip_address, user_agent, dados_antes, dados_depois, data_acao) FROM stdin;
1	1	login	Usuário admin realizou login para teste	127.0.0.1	\N	\N	\N	2026-05-28 13:26:45.610515-03
2	1	criar_ideia	Usuário admin criou uma ideia de teste	127.0.0.1	\N	\N	\N	2026-05-28 13:26:45.610515-03
\.


--
-- TOC entry 5292 (class 0 OID 24855)
-- Dependencies: 246
-- Data for Name: metricas_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metricas_cache (id, total_ideias, total_usuarios, taxa_conversao, ultima_atualizacao) FROM stdin;
\.


--
-- TOC entry 5300 (class 0 OID 24925)
-- Dependencies: 254
-- Data for Name: notificacoes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notificacoes (id, mensagem, id_usuario, id_ideia, categoria, lida, data_envio) FROM stdin;
1	🔴 SUA IDEIA FOI REMOVIDA\n\n📌 Título: "Como melhorar a biblioteca"\n📋 Motivo: Conteúdo Impróprio\n💬 Justificativa: Linguagem ofensiva detectada\n\n⚠️ Esta ação foi registrada. Revise as diretrizes da comunidade antes de novas publicações.	1	85	moderacao	f	2026-05-28 11:39:49.735791-03
2	🟠 ADVERTÊNCIA RECEBIDA\n\n📌 Ideia: "Proposta de novo sistema"\n📋 Motivo: Discurso de Ódio\n💬 Justificativa: Comentários agressivos\n\nℹ️ Acumular 3 advertências pode resultar em suspensão da conta.	2	81	moderacao	f	2026-05-28 11:39:49.735791-03
4	⭐ UPGRADE DE NÍVEL! ⭐\n\n🏆 Parabéns! Você avançou para o NÍVEL 3!\n📊 Pontos totais: 250 pontos\n\n💡 Continue participando para desbloquear novas conquistas e benefícios.	4	\N	conquista	f	2026-05-28 11:39:49.735791-03
5	🏆 NOVA CONQUISTA DESBLOQUEADA!\n\n✨ Mestre das Ideias\n📝 Criou 10 ideias na plataforma!\n➕ +50 pontos adicionados!\n\n🎯 Continue assim para desbloquear ainda mais conquistas!	5	\N	conquista	f	2026-05-28 11:39:49.735791-03
6	💬 NOVO COMENTÁRIO NA SUA IDEIA!\n\n📌 Ideia: "Laboratório de inovação"\n👤 Autor do comentário: João Silva\n\n🔗 Clique para visualizar e responder ao comentário.	1	75	comentario	f	2026-05-28 11:39:49.735791-03
7	✏️ SUA IDEIA FOI EDITADA\n\n📌 Título: "Sistema de monitoramento"\n👤 Editado por: Administrador\n\nℹ️ A edição foi feita para adequar sua ideia às diretrizes da plataforma. Verifique as alterações.	2	88	moderacao	f	2026-05-28 11:39:49.735791-03
8	⚠️ SEU COMENTÁRIO FOI DENUNCIADO\n\n📌 Ideia: "Chatbot para alunos"\n📝 Seu comentário: "Isso é uma péssima ideia, nunca vai funcionar"\n👤 Denunciante: Maria Oliveira\n📋 Motivo: Conteúdo Impróprio\n\n🕊️ A moderação analisará o caso em até 48h. Recomendamos revisar suas interações na plataforma.	3	79	report_autor	f	2026-05-28 11:39:49.735791-03
9	👮 NOVA DENÚNCIA DE COMENTÁRIO\n\n📌 Ideia: "Plataforma de cursos online"\n📝 Comentário: "Conteúdo ofensivo contra colegas"\n👤 Autor do comentário: Pedro Santos\n👮 Denunciante: Ana Costa\n📋 Motivo: Discurso de Ódio\n\n🔗 Acesse o painel de moderação para analisar esta denúncia.	5	87	report_admin	f	2026-05-28 11:39:49.735791-03
10	🗑️ SEU COMENTÁRIO FOI REMOVIDO\n\n📌 Ideia: "Sistema de avaliação"\n📋 Motivo: Violação das diretrizes da comunidade\n\nℹ️ Sua contribuição foi removida por não seguir as regras de conduta. Consulte nossas diretrizes para evitar novas remoções.	4	91	moderacao	f	2026-05-28 11:39:49.735791-03
11	✅ DENÚNCIA ANALISADA\n\n📌 Ideia: "Espaço maker no campus"\n📋 Resultado: Nenhuma ação necessária\n\nℹ️ A denúncia contra seu comentário foi analisada e considerada improcedente. O comentário permanece no ar.	10	76	moderacao	f	2026-05-28 11:39:49.735791-03
12	📢 SUA IDEIA FOI DENUNCIADA\n\n📌 Título: "Criptomoeda para universidade"\n👤 Denunciante: Carlos Mendes\n📋 Motivo: Fake News\n💬 Detalhes: Informações não verificadas sobre blockchain\n\n🕊️ A equipe de moderação analisará sua ideia nos próximos dias. Não se preocupe, você pode acompanhar o status.	1	80	report_autor	f	2026-05-28 11:39:49.735791-03
13	👮 NOVA DENÚNCIA DE IDEIA\n\n📌 Título: "Método revolucionário de ensino"\n👤 Autor: Prof. Ricardo Alves\n👮 Denunciante: Comissão de Ética\n📋 Motivo: Conteúdo Impróprio\n💬 Detalhes: Método não comprovado cientificamente\n\n🔗 Acesse o painel de moderação para analisar esta denúncia com urgência.	2	84	report_admin	f	2026-05-28 11:39:49.735791-03
15	📢 SUA IDEIA FOI DENUNCIADA\n\n📌 Título: "Biblioteca Virtual com Acervo Digital"\n👤 Denunciante: Homem Teste\n📋 Motivo: Outro\n💬 Detalhes: teste\n\n🕊️ A equipe de moderação analisará sua ideia nos próximos dias. Não se preocupe, você pode acompanhar o status.	5	82	report_autor	f	2026-05-28 12:37:11.916149-03
16	👮 NOVA DENÚNCIA DE IDEIA\n\n📌 Título: "Biblioteca Virtual com Acervo Digital"\n👤 Autor: Admin Principal\n👮 Denunciante: Homem Teste\n📋 Motivo: Outro\n💬 Detalhes: teste\n\n🔗 Acesse o painel de moderação para analisar esta denúncia com urgência.	3	82	report_admin	f	2026-05-28 12:37:11.931923-03
17	👮 NOVA DENÚNCIA DE IDEIA\n\n📌 Título: "Biblioteca Virtual com Acervo Digital"\n👤 Autor: Admin Principal\n👮 Denunciante: Homem Teste\n📋 Motivo: Outro\n💬 Detalhes: teste\n\n🔗 Acesse o painel de moderação para analisar esta denúncia com urgência.	5	82	report_admin	f	2026-05-28 12:37:11.932959-03
18	⚠️ SEU COMENTÁRIO FOI DENUNCIADO\n\n📌 Ideia: "Laboratório de Realidade Virtual"\n📝 Seu comentário: "Isso revolucionaria as aulas práticas!"\n👤 Denunciante: Gabriel Borba\n📋 Motivo: Outro\n\n🕊️ A moderação analisará o caso em até 48h. Recomendamos revisar suas interações na plataforma.	4	76	report_autor	f	2026-05-28 12:43:46.550029-03
19	👮 NOVA DENÚNCIA DE COMENTÁRIO\n\n📌 Ideia: "Laboratório de Realidade Virtual"\n📝 Comentário: "Isso revolucionaria as aulas práticas!"\n👤 Autor do comentário: Professor Demo\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Outro\n\n🔗 Acesse o painel de moderação para analisar esta denúncia.	3	76	report_admin	f	2026-05-28 12:43:46.552836-03
20	👮 NOVA DENÚNCIA DE COMENTÁRIO\n\n📌 Ideia: "Laboratório de Realidade Virtual"\n📝 Comentário: "Isso revolucionaria as aulas práticas!"\n👤 Autor do comentário: Professor Demo\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Outro\n\n🔗 Acesse o painel de moderação para analisar esta denúncia.	5	76	report_admin	f	2026-05-28 12:43:46.553473-03
21	⚠️ SEU COMENTÁRIO FOI DENUNCIADO\n\n📌 Ideia: "Biblioteca Virtual com Acervo Digital"\n📝 Seu comentário: "Ótima ideia! Isso facilitaria muito o acesso aos materiais."\n👤 Denunciante: Homem Teste\n📋 Motivo: Outro\n\n🕊️ A moderação analisará o caso em até 48h. Recomendamos revisar suas interações na plataforma.	2	82	report_autor	f	2026-05-28 12:49:46.849411-03
22	👮 NOVA DENÚNCIA DE COMENTÁRIO\n\n📌 Ideia: "Biblioteca Virtual com Acervo Digital"\n📝 Comentário: "Ótima ideia! Isso facilitaria muito o acesso aos materiais."\n👤 Autor do comentário: Administrador\n👮 Denunciante: Homem Teste\n📋 Motivo: Outro\n\n🔗 Acesse o painel de moderação para analisar esta denúncia.	3	82	report_admin	f	2026-05-28 12:49:46.851656-03
23	👮 NOVA DENÚNCIA DE COMENTÁRIO\n\n📌 Ideia: "Biblioteca Virtual com Acervo Digital"\n📝 Comentário: "Ótima ideia! Isso facilitaria muito o acesso aos materiais."\n👤 Autor do comentário: Administrador\n👮 Denunciante: Homem Teste\n📋 Motivo: Outro\n\n🔗 Acesse o painel de moderação para analisar esta denúncia.	5	82	report_admin	f	2026-05-28 12:49:46.85229-03
14	🔴 SUA IDEIA FOI REMOVIDA POR DENÚNCIAS\n\n📌 Título: "Sistema paralelo não autorizado"\n📋 Motivo: Múltiplas denúncias da comunidade\n\n⚠️ Após análise da moderação, sua ideia foi removida por violar as diretrizes da plataforma.	10	\N	moderacao	f	2026-05-28 11:39:49.735791-03
24	⚠️ SEU COMENTÁRIO FOI DENUNCIADO\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n📝 Seu comentário: "Gostei! Poderia incluir também sensores de luminosidade."\n👤 Denunciante: Homem Teste\n📋 Motivo: Outro\n\n🕊️ A moderação analisará o caso em até 48h. Recomendamos revisar suas interações na plataforma.	3	\N	report_autor	f	2026-05-28 12:52:50.897253-03
25	👮 NOVA DENÚNCIA DE COMENTÁRIO\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n📝 Comentário: "Gostei! Poderia incluir também sensores de luminosidade."\n👤 Autor do comentário: Equipe TI\n👮 Denunciante: Homem Teste\n📋 Motivo: Outro\n\n🔗 Acesse o painel de moderação para analisar esta denúncia.	3	\N	report_admin	f	2026-05-28 12:52:50.89953-03
26	👮 NOVA DENÚNCIA DE COMENTÁRIO\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n📝 Comentário: "Gostei! Poderia incluir também sensores de luminosidade."\n👤 Autor do comentário: Equipe TI\n👮 Denunciante: Homem Teste\n📋 Motivo: Outro\n\n🔗 Acesse o painel de moderação para analisar esta denúncia.	5	\N	report_admin	f	2026-05-28 12:52:50.900377-03
27	✅ A denúncia contra seu comentário foi analisada e não será necessária ação.	3	\N	moderacao	f	2026-05-28 12:53:04.477212-03
28	🟠 ADVERTÊNCIA RECEBIDA\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n📋 Motivo: Fora do Tema\n💬 Justificativa: Moderando só por teste\n\nℹ️ Acumular 3 advertências pode resultar em suspensão da conta.	1	\N	moderacao	f	2026-05-28 12:55:49.498081-03
3	🚀 IDEIA CONVERTIDA EM PROJETO!\n\n📌 Ideia: "App de mobilidade acadêmica"\n🏷️ Projeto: "Mobilidade Inteligente UFFS"\n🎉 Parabéns! Sua ideia foi selecionada para se tornar um projeto oficial.\n\n🔗 Acompanhe o progresso na seção de Projetos.	3	\N	sucesso	f	2026-05-28 11:39:49.735791-03
31	🔴 SUA IDEIA FOI REMOVIDA\n\n📌 Título: "teste 3"\n📋 Motivo: Fora do Tema\n💬 Justificativa: teste\n\n⚠️ Esta ação foi registrada. Revise as diretrizes da comunidade antes de novas publicações.	10	\N	moderacao	f	2026-05-28 13:05:03.521347-03
32	🔴 SUA IDEIA FOI REMOVIDA\n\n📌 Título: "teste 2"\n📋 Motivo: Fora do Tema\n💬 Justificativa: Vlw flow dnv uma ultima vez\n\n⚠️ Esta ação foi registrada. Revise as diretrizes da comunidade antes de novas publicações.	10	\N	moderacao	f	2026-05-28 13:07:31.449028-03
33	🏆 NOVA CONQUISTA DESBLOQUEADA!\n\n✨ Mestre das Ideias\n📝 Criou 10 ideias\n➕ +50 pontos adicionados!\n\n🎯 Continue assim para desbloquear ainda mais conquistas!	5	\N	geral	f	2026-05-28 15:44:22.557325-03
\.


--
-- TOC entry 5317 (class 0 OID 25151)
-- Dependencies: 271
-- Data for Name: notificacoes_backup_20260528; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notificacoes_backup_20260528 (id, mensagem, id_usuario, id_ideia, categoria, lida, data_envio) FROM stdin;
4	🧪 TESTE: Notificação para aluno	3	\N	geral	f	2026-04-23 14:44:04.303011-03
5	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "Reclamação sobre o atendimento"\n👤 Autor: Professor Demo\n📋 Motivo: Spam\n👮 Denunciante: ID 1	3	81	report	f	2026-04-23 14:45:08.907957-03
9	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "Aplicativo de Cardápio do RU"\n👤 Autor: Professor Demo\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n🆔 ID da Ideia: 80	3	80	report_admin	f	2026-04-23 14:50:13.621411-03
16	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "teste"\n👤 Autor: Professor Demo\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n	5	\N	report_admin	t	2026-04-23 14:57:24.142042-03
19	Novo comentário na sua ideia: "Biblioteca Virtual com Acervo Digital..."	5	82	geral	t	2026-04-30 15:37:02.652367-03
12	🏆 Nova conquista desbloqueada: Primeira Ideia! +10 pontos	4	\N	geral	f	2026-04-23 14:57:11.968778-03
17	🏆 Nova conquista desbloqueada: Primeira Ideia! +10 pontos	1	\N	geral	t	2026-04-29 15:50:27.018212-03
13	📢 SUA IDEIA FOI DENUNCIADA!\n\n📌 Ideia: "teste"\n👤 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n💬 Detalhes: teste\n\nA moderação irá analisar sua ideia. Por favor, aguarde.	4	\N	report_autor	f	2026-04-23 14:57:24.136883-03
14	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "teste"\n👤 Autor: Professor Demo\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n	3	\N	report_admin	f	2026-04-23 14:57:24.139464-03
20	Novo comentário na sua ideia: "Sistema de Mentorias entre Alunos..."	3	79	geral	f	2026-04-30 15:37:09.594157-03
21	Novo comentário na sua ideia: "Programa de Saúde Mental..."	2	87	geral	f	2026-04-30 15:37:17.045187-03
22	Novo comentário na sua ideia: "Festival de Talentos da Universidade..."	3	88	geral	f	2026-04-30 15:37:22.750731-03
26	Novo comentário na sua ideia: "Câmeras nos Estacionamentos..."	3	85	geral	f	2026-04-30 15:37:51.97077-03
27	Novo comentário na sua ideia: "Aplicativo de Cardápio do RU..."	4	80	geral	f	2026-04-30 15:37:57.324132-03
30	🏆 Nova conquista desbloqueada: Mestre das Ideias! +50 pontos	10	\N	geral	t	2026-04-30 15:40:31.265189-03
28	🏆 Nova conquista desbloqueada: Comunicador! +20 pontos	10	\N	geral	t	2026-04-30 15:38:05.602403-03
18	🏆 Nova conquista desbloqueada: Primeira Ideia! +10 pontos	10	\N	geral	t	2026-04-30 15:35:52.293271-03
25	Novo comentário na sua ideia: "Hub de Inovação e Empreendedorismo..."	5	83	geral	t	2026-04-30 15:37:46.927334-03
32	🚀 Sua ideia "teste 10..." foi convertida no projeto "teste 10"!	10	\N	geral	t	2026-04-30 15:41:25.093253-03
31	🏆 Nova conquista desbloqueada: Ideia Implementada! +100 pontos	10	\N	geral	t	2026-04-30 15:41:25.091113-03
34	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "teste 10"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n	3	\N	report_admin	f	2026-04-30 15:45:30.338015-03
35	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "teste 10"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n	2	\N	report_admin	f	2026-04-30 15:45:30.338828-03
36	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "teste 10"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n	5	\N	report_admin	t	2026-04-30 15:45:30.339651-03
33	📢 SUA IDEIA FOI DENUNCIADA!\n\n📌 Ideia: "teste 10"\n👤 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n💬 Detalhes: Spam absurdo de teste\n\nA moderação irá analisar sua ideia. Por favor, aguarde.	10	\N	report_autor	t	2026-04-30 15:45:30.333494-03
40	⚠️ ADVERTÊNCIA RECEBIDA!\n\n📌 Ideia: "teste 3"\n📋 Motivo: Spam\n💬 Justificativa: Se enviar mais algum "teste" eu te BANO\n\nPor favor, revise suas próximas publicações.	10	93	moderacao	t	2026-04-30 16:34:02.364745-03
24	Novo comentário na sua ideia: "App de Caronas Solidárias..."	2	\N	geral	f	2026-04-30 15:37:41.382451-03
43	🚀 Sua ideia "teste 9..." foi convertida no projeto "teste"!	10	99	geral	f	2026-04-30 16:44:18.691017-03
44	📢 SUA IDEIA FOI DENUNCIADA!\n\n📌 Ideia: "teste 6"\n👤 Denunciante: Gabriel Borba\n📋 Motivo: Conteúdo Impróprio\n💬 Detalhes: treste\n\nA moderação irá analisar sua ideia. Por favor, aguarde.	10	\N	report_autor	f	2026-04-30 16:45:59.670268-03
45	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "teste 6"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Conteúdo Impróprio\n	3	\N	report_admin	f	2026-04-30 16:45:59.672592-03
46	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "teste 6"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Conteúdo Impróprio\n	5	\N	report_admin	f	2026-04-30 16:45:59.673669-03
48	📢 SUA IDEIA FOI DENUNCIADA!\n\n📌 Ideia: "teste 9"\n👤 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n💬 Detalhes: teste\n\nA moderação irá analisar sua ideia. Por favor, aguarde.	10	99	report_autor	f	2026-04-30 16:49:26.754625-03
49	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "teste 9"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Spam\n	3	99	report_admin	f	2026-04-30 16:49:26.758393-03
53	🏆 Nova conquista desbloqueada: Primeira Ideia! +10 pontos	5	\N	geral	f	2026-05-07 11:07:20.703466-03
54	📢 SEU COMENTÁRIO FOI DENUNCIADO!\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n📝 Comentário: "Sou o homem teste!!!"\n👤 Denunciante: Gabriel Borba\n📋 Motivo: Outro\n\nA moderação irá analisar seu comentário.	10	74	report_autor	f	2026-05-28 09:30:16.314539-03
55	📢 NOVA DENÚNCIA DE COMENTÁRIO!\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n📝 Comentário: "Sou o homem teste!!!"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Outro	3	74	report_admin	f	2026-05-28 09:30:16.320506-03
56	📢 NOVA DENÚNCIA DE COMENTÁRIO!\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n📝 Comentário: "Sou o homem teste!!!"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Outro	5	74	report_admin	t	2026-05-28 09:30:16.321141-03
57	📢 SEU COMENTÁRIO FOI DENUNCIADO!\n\n📌 Ideia: "Biblioteca Virtual com Acervo Digital"\n📝 Comentário: "Sou o homem teste!!!"\n👤 Denunciante: Gabriel Borba\n📋 Motivo: Outro\n\nA moderação irá analisar seu comentário.	10	82	report_autor	f	2026-05-28 09:43:37.341233-03
58	📢 NOVA DENÚNCIA DE COMENTÁRIO!\n\n📌 Ideia: "Biblioteca Virtual com Acervo Digital"\n📝 Comentário: "Sou o homem teste!!!"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Outro	3	82	report_admin	f	2026-05-28 09:43:37.344444-03
59	📢 NOVA DENÚNCIA DE COMENTÁRIO!\n\n📌 Ideia: "Biblioteca Virtual com Acervo Digital"\n📝 Comentário: "Sou o homem teste!!!"\n👤 Autor: Homem Teste\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Outro	5	82	report_admin	f	2026-05-28 09:43:37.345117-03
60	📢 SEU COMENTÁRIO FOI DENUNCIADO!\n\n📌 Ideia: "Biblioteca Virtual com Acervo Digital"\n📝 Comentário: "Ótima ideia! Isso facilitaria muito o acesso aos materiais."\n👤 Denunciante: Gabriel Borba\n📋 Motivo: Outro\n\nA moderação irá analisar seu comentário.	2	82	report_autor	f	2026-05-28 09:47:41.599072-03
61	📢 NOVA DENÚNCIA DE COMENTÁRIO!\n\n📌 Ideia: "Biblioteca Virtual com Acervo Digital"\n📝 Comentário: "Ótima ideia! Isso facilitaria muito o acesso aos materiais."\n👤 Autor: Administrador\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Outro	3	82	report_admin	f	2026-05-28 09:47:41.602393-03
62	📢 NOVA DENÚNCIA DE COMENTÁRIO!\n\n📌 Ideia: "Biblioteca Virtual com Acervo Digital"\n📝 Comentário: "Ótima ideia! Isso facilitaria muito o acesso aos materiais."\n👤 Autor: Administrador\n👮 Denunciante: Gabriel Borba\n📋 Motivo: Outro	5	82	report_admin	f	2026-05-28 09:47:41.603375-03
63	📋 A denúncia contra seu comentário foi analisada e não será necessária ação.	2	82	moderacao	f	2026-05-28 09:57:08.46301-03
64	📋 A denúncia contra seu comentário foi analisada e não será necessária ação.	10	74	moderacao	f	2026-05-28 09:57:18.449385-03
65	🗑️ Seu comentário foi removido por violar as regras da comunidade.	10	82	moderacao	f	2026-05-28 09:57:21.3612-03
66	📢 SUA IDEIA FOI DENUNCIADA!\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n👤 Denunciante: Homem Teste\n📋 Motivo: Outro\n💬 Detalhes: teste é teste\n\nA moderação irá analisar sua ideia. Por favor, aguarde.	1	74	report_autor	f	2026-05-28 09:58:36.317284-03
67	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n👤 Autor: Gabriel Borba\n👮 Denunciante: Homem Teste\n📋 Motivo: Outro\n	5	74	report_admin	f	2026-05-28 09:58:36.320184-03
68	📢 NOVA DENÚNCIA!\n\n📌 Ideia: "Sistema de Monitoramento de Salas TESTE"\n👤 Autor: Gabriel Borba\n👮 Denunciante: Homem Teste\n📋 Motivo: Outro\n	3	74	report_admin	f	2026-05-28 09:58:36.321188-03
\.


--
-- TOC entry 5306 (class 0 OID 24990)
-- Dependencies: 260
-- Data for Name: periodos_submissao; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.periodos_submissao (id, nome, data_inicio, data_fim, ativo, criado_por, criado_em) FROM stdin;
\.


--
-- TOC entry 5298 (class 0 OID 24905)
-- Dependencies: 252
-- Data for Name: pontuacao_usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pontuacao_usuario (id, id_usuario, pontos_totais, nivel, data_atualizacao) FROM stdin;
1	3	0	1	2026-04-23 12:34:36.549248-03
2	2	0	1	2026-04-23 12:34:36.549248-03
5	1	76	1	2026-05-28 13:49:56.310701-03
3	4	10	1	2026-04-23 14:57:11.96664-03
4	5	196	2	2026-05-28 15:44:23.213463-03
16	10	180	2	2026-04-30 15:41:25.089222-03
\.


--
-- TOC entry 5312 (class 0 OID 25074)
-- Dependencies: 266
-- Data for Name: preferencias_notificacoes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.preferencias_notificacoes (id, id_usuario, email_ativado, ultimo_envio, created_at, updated_at) FROM stdin;
1	5	t	\N	2026-05-28 08:39:11.956968	2026-05-28 08:39:14.154918
3	1	t	\N	2026-05-28 10:02:49.340588	2026-05-28 10:02:56.614953
6	3	t	\N	2026-05-28 11:01:37.720504	2026-05-28 11:01:37.720504
7	10	t	\N	2026-05-28 11:01:37.720504	2026-05-28 11:01:37.720504
8	4	t	\N	2026-05-28 11:01:37.720504	2026-05-28 11:01:37.720504
9	2	t	\N	2026-05-28 11:01:37.720504	2026-05-28 11:01:37.720504
\.


--
-- TOC entry 5276 (class 0 OID 16549)
-- Dependencies: 230
-- Data for Name: projetos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projetos (id, nome, descricao, responsavel, data_inicio, prioridade, status, data_criacao, id_ideia, id_responsavel, deletado, data_delecao, deletado_por) FROM stdin;
6	PlaceHolder	Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam at erat bibendum, pharetra massa ac, vestibulum sapien. Aenean quis lectus mattis, tempus purus eget, semper lectus. Nam porttitor placerat nunc, eget venenatis sapien fermentum vel. Morbi condimentum, tellus et dignissim bibendum, mi elit tincidunt sem, a eleifend mauris lorem vitae ligula. Nullam blandit nisl eget nisi sodales, vitae sollicitudin orci accumsan. Sed nec nisi vehicula, lobortis orci et, blandit purus. Sed et felis nec felis pellentesque tincidunt at nec lacus. Maecenas rhoncus neque a lectus aliquet vulputate. Vivamus pulvinar at sapien at viverra. In turpis arcu, hendrerit bibendum bibendum eu, lobortis vitae orci. Morbi at risus neque. Sed tempor libero ante, id faucibus nisl commodo laoreet. Curabitur blandit massa sed lacus tempor, non ultricies quam euismod. Nunc semper fermentum nunc, pellentesque consectetur orci.	Fulano jorel	2006-02-01	media	planejamento	2026-04-11 00:39:02.205939-03	\N	2	t	2026-04-16 10:34:40.41501-03	5
5	PlaceHolder	Lorem ipsum dolor sit amet. 33 molestiae dolor ut consectetur quia ut enim error et omnis quasi et obcaecati consequatur. Aut praesentium sequi ea nihil architecto ut omnis officia et totam velit cum similique galisum. Qui dolor adipisci ad quaerat assumenda eos ducimus dolore qui ipsam unde eum deleniti galisum? Non quos vero aut quia quibusdam 33 officiis fugit est optio minus qui illum pariatur.\n\nEst explicabo rerum eum praesentium sint et suscipit ipsam. Et velit molestias ut repudiandae galisum cum voluptatem nisi.\n\nEt nesciunt reprehenderit ut quia sint nam ratione amet sed voluptatem assumenda vel laborum totam eum fugit nulla. Et quis tenetur non harum fuga non internos maxime et odio accusamus in reprehenderit incidunt sed numquam itaque.	Fulano	2026-04-11	baixa	planejamento	2026-04-10 23:37:43.299227-03	\N	5	t	2026-04-16 10:34:43.183075-03	5
7	PlaceHolder	Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam at erat bibendum, pharetra massa ac, vestibulum sapien. Aenean quis lectus mattis, tempus purus eget, semper lectus. Nam porttitor placerat nunc, eget venenatis sapien fermentum vel. Morbi condimentum, tellus et dignissim bibendum, mi elit tincidunt sem, a eleifend mauris lorem vitae ligula. Nullam blandit nisl eget nisi sodales, vitae sollicitudin orci accumsan. Sed nec nisi vehicula, lobortis orci et, blandit purus. Sed et felis nec felis pellentesque tincidunt at nec lacus. Maecenas rhoncus neque a lectus aliquet vulputate. Vivamus pulvinar at sapien at viverra. In turpis arcu, hendrerit bibendum bibendum eu, lobortis vitae orci. Morbi at risus neque. Sed tempor libero ante, id faucibus nisl commodo laoreet. Curabitur blandit massa sed lacus tempor, non ultricies quam euismod. Nunc semper fermentum nunc, pellentesque consectetur orci.	asdasda	2026-04-07	alta	planejamento	2026-04-11 00:46:16.744169-03	\N	2	t	2026-04-16 10:34:37.780617-03	5
10	PlaceHolder	Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam placerat sagittis ipsum, ut vestibulum libero laoreet et. Proin faucibus dui sed ornare dapibus. Etiam fermentum dui ac massa rutrum, suscipit vulputate velit semper. Nulla efficitur semper consectetur. Mauris in luctus ante, nec suscipit augue. In eu eros ac metus efficitur bibendum id sed ante. Donec enim elit, vestibulum hendrerit blandit ac, ultricies sed enim. Mauris ac volutpat justo. Aliquam id commodo sem. Fusce auctor nisl a vulputate rutrum. Pellentesque a ante id neque volutpat commodo. Curabitur tincidunt euismod vulputate. Nulla pulvinar elit quam, quis consectetur lorem efficitur a. Suspendisse nec ex in justo pulvinar dictum.	Jorel	2026-04-16	media	planejamento	2026-04-16 09:42:35.375775-03	\N	5	f	\N	\N
11	Estagio	vagas	Fulano	2026-04-30	alta	planejamento	2026-04-16 21:13:51.609254-03	\N	5	t	2026-04-30 15:42:42.618463-03	5
12	teste 10	seu teste mereceu uma bonificação de teste mermo!	Fulano	2026-04-30	alta	planejamento	2026-04-30 15:41:25.073046-03	\N	5	t	2026-04-30 16:51:36.395795-03	5
13	teste	teste	teste	2026-04-30	alta	planejamento	2026-04-30 16:44:18.681269-03	\N	5	t	2026-04-30 16:51:39.55606-03	5
\.


--
-- TOC entry 5282 (class 0 OID 24700)
-- Dependencies: 236
-- Data for Name: projetos_lixeira; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projetos_lixeira (id, projeto_original_id, nome, descricao, responsavel, prioridade, status, data_criacao, data_delecao, deletado_por) FROM stdin;
1	1	Botar a ideia ABRIL pra ir né!	Simbora	Jorel	media	planejamento	2026-04-09 11:32:50.072-03	2026-04-09 13:31:58.791751-03	5
2	2	So com vodka	simbora	Jorel	alta	planejamento	2026-04-09 13:33:11.197-03	2026-04-09 13:33:29.275073-03	5
3	2	So com vodka	simbora	Jorel	alta	planejamento	2026-04-09 13:33:11.197-03	2026-04-09 13:35:11.197909-03	5
4	2	So com vodka	simbora	Jorel	alta	planejamento	2026-04-09 13:33:11.197-03	2026-04-09 13:35:32.804496-03	5
5	2	So com vodka	simbora	Jorel	alta	planejamento	2026-04-09 13:33:11.197-03	2026-04-09 13:37:29.935766-03	5
6	3	Botar a ideia MARÇO pra ir né!	simbora	Jorel	alta	planejamento	2026-04-09 13:38:22.568-03	2026-04-09 13:38:31.435837-03	5
7	3	Botar a ideia MARÇO pra ir né!	simbora	Jorel	alta	planejamento	2026-04-09 13:38:22.568-03	2026-04-09 13:41:14.131057-03	5
8	3	Botar a ideia MARÇO pra ir né!	simbora	Jorel	alta	planejamento	2026-04-09 13:38:22.568-03	2026-04-09 13:41:21.052396-03	5
9	3	Botar a ideia MARÇO pra ir né!	simbora	Jorel	alta	planejamento	2026-04-09 13:38:22.568-03	2026-04-09 13:41:48.751499-03	5
10	3	Botar a ideia MARÇO pra ir né!	simbora	Jorel	alta	planejamento	2026-04-09 13:38:22.568-03	2026-04-09 13:42:53.231791-03	5
11	3	Botar a ideia MARÇO pra ir né!	simbora	Jorel	alta	planejamento	2026-04-09 13:38:22.568-03	2026-04-09 13:52:37.074093-03	5
12	3	Botar a ideia MARÇO pra ir né!	simbora	Jorel	alta	planejamento	2026-04-09 13:38:22.568-03	2026-04-09 13:55:09.521525-03	5
13	3	Botar a ideia MARÇO pra ir né!	simbora	Jorel	alta	planejamento	2026-04-09 13:38:22.568-03	2026-04-09 13:55:17.373264-03	5
\.


--
-- TOC entry 5280 (class 0 OID 24665)
-- Dependencies: 234
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, motivo, descricao, data_report, status, id_usuario, id_ideia, resolvido_por, data_resolucao, justificativa, notificado) FROM stdin;
11	spam	Apenas teste querido	2026-04-23 14:50:13.615689-03	resolvido	1	80	2	2026-04-23 16:50:41.00844-03	\N	f
10	spam	Apenas teste	2026-04-23 14:45:08.905552-03	resolvido	1	81	2	2026-04-23 16:50:43.171843-03	\N	f
19	outro	teste	2026-05-28 12:37:11.914654-03	resolvido	10	82	5	2026-05-28 12:48:41.557894-03	\N	f
\.


--
-- TOC entry 5316 (class 0 OID 25117)
-- Dependencies: 270
-- Data for Name: reports_comentarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports_comentarios (id, id_comentario, id_usuario, motivo, descricao, status, data_report, resolvido_por, data_resolucao) FROM stdin;
\.


--
-- TOC entry 5308 (class 0 OID 25013)
-- Dependencies: 262
-- Data for Name: templates_ideias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.templates_ideias (id, titulo, descricao, categoria, campos_json, recomendado, ativo, criado_por, criado_em, total_usos) FROM stdin;
1	Proposta de Expansão de Wi-Fi	Sugestão para melhorar a cobertura de rede sem fio em áreas críticas.	Infraestrutura de Rede	[{"nome": "Problema identificado", "placeholder": "Descreva as áreas com sinal fraco ou ausente..."}, {"nome": "Solução proposta", "placeholder": "Ex: instalação de novos access points, upgrade de equipamentos..."}, {"nome": "Público-alvo", "placeholder": "Alunos, professores, laboratórios, salas específicas..."}, {"nome": "Recursos necessários", "placeholder": "Equipamentos, orçamento, mão de obra..."}]	t	t	\N	2026-05-14 09:17:40.908789	0
2	Aplicativo Educacional para Sala de Aula	Proposta de desenvolvimento de software para auxiliar professores e alunos.	Software Educacional	[{"nome": "Problema identificado", "placeholder": "Qual dificuldade atual no ensino?"}, {"nome": "Solução proposta", "placeholder": "Descreva as funcionalidades principais..."}, {"nome": "Público-alvo", "placeholder": "Disciplinas, séries ou cursos que seriam beneficiados..."}, {"nome": "Recursos necessários", "placeholder": "Equipe de desenvolvimento, infraestrutura..."}]	t	t	\N	2026-05-14 09:17:40.908789	0
\.


--
-- TOC entry 5296 (class 0 OID 24882)
-- Dependencies: 250
-- Data for Name: usuario_conquistas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario_conquistas (id, id_usuario, id_conquista, data_obtencao) FROM stdin;
1	4	22	2026-04-23 14:57:11.963264-03
2	1	22	2026-04-29 15:50:27.002083-03
3	10	22	2026-04-30 15:35:52.288615-03
4	10	26	2026-04-30 15:38:05.601485-03
5	10	23	2026-04-30 15:40:31.261538-03
6	10	24	2026-04-30 15:41:25.088515-03
7	5	22	2026-05-07 11:07:20.701606-03
8	5	23	2026-05-28 15:44:22.555222-03
\.


--
-- TOC entry 5266 (class 0 OID 16390)
-- Dependencies: 220
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nome, email, senha, data_cadastro, role, ativo, cargo, ultimo_acesso, criado_por, total_advertencias, nivel_atual, pontos_totais, ideias_removidas) FROM stdin;
3	Equipe TI	ti@ideahub.com	ti123	2026-04-09 09:51:55.825141-03	aluno	t	ti_staff	\N	\N	0	1	0	0
4	Professor Demo	professor@escola.com	prof123	2026-04-09 09:53:47.381685-03	aluno	t	professor	2026-04-30 15:36:30.636452-03	\N	1	1	10	0
2	Administrador	admin@ideahub.com	admin123	2026-04-09 09:51:55.825141-03	aluno	f	gestor	2026-04-23 14:57:41.807825-03	\N	0	1	0	0
10	Homem Teste	teste@gmail.com	jorel123	2026-04-30 15:35:27.751088-03	aluno	t	aluno	2026-05-28 13:45:55.882955-03	\N	4	2	180	0
5	Admin Principal	admin2@ideahub.com	admin123	2026-04-09 10:46:21.392266-03	aluno	t	gestor	2026-05-28 14:11:20.251517-03	\N	0	2	196	0
1	Gabriel Borba	borbabrbiel@gmail.com	01022006	2026-04-08 18:10:52.042635-03	aluno	t	aluno	2026-05-28 15:45:08.019191-03	\N	2	1	76	0
\.


--
-- TOC entry 5310 (class 0 OID 25036)
-- Dependencies: 264
-- Data for Name: versoes_ideias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.versoes_ideias (id, id_ideia, titulo, descricao, categoria_id, versao_numero, alterado_por, data_alteracao) FROM stdin;
1	108	Proposta de Expansão de Wi-Fi	*Problema identificado:* Descreva as áreas com sinal fraco ou ausente...\n*Solução proposta:* Ex: instalação de novos access points, upgrade de equipamentos...\n*Público-alvo:* Alunos, professores, laboratórios, salas específicas...\n*Recursos necessários:* Equipamentos, orçamento, mão de obra...	17	1	5	2026-05-20 11:01:41.474058
2	108	Proposta de Expansão de Wi-Fi	*Problema identificado:* Descreva as áreas com sinal fraco ou ausente...\n*Solução proposta:* Ex: instalação de novos access points, upgrade de equipamentos...\n*Público-alvo:* Alunos, professores, laboratórios, salas específicas...\n*Recursos necessários:* Equipamentos, orçamento, mão de obra...\n2.0	11	2	5	2026-05-20 11:09:55.887968
\.


--
-- TOC entry 5272 (class 0 OID 16445)
-- Dependencies: 226
-- Data for Name: votos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.votos (id, id_usuario, id_ideia, data_voto) FROM stdin;
13	1	75	2026-04-23 14:03:59.540918-03
14	3	75	2026-04-23 14:03:59.540918-03
15	5	75	2026-04-23 14:03:59.540918-03
17	2	76	2026-04-23 14:03:59.540918-03
18	4	76	2026-04-23 14:03:59.540918-03
21	2	82	2026-04-23 14:03:59.540918-03
22	3	82	2026-04-23 14:03:59.540918-03
23	4	82	2026-04-23 14:03:59.540918-03
24	5	82	2026-04-23 14:03:59.540918-03
26	2	83	2026-04-23 14:03:59.540918-03
27	3	83	2026-04-23 14:03:59.540918-03
28	10	82	2026-04-30 15:38:23.510589-03
29	10	79	2026-04-30 15:38:25.2519-03
30	10	83	2026-04-30 15:38:29.100684-03
31	10	87	2026-04-30 15:38:30.978592-03
32	10	88	2026-04-30 15:38:31.843616-03
34	10	78	2026-04-30 15:38:33.947504-03
35	10	84	2026-04-30 15:38:35.227076-03
36	10	81	2026-04-30 15:38:36.831565-03
37	10	75	2026-04-30 15:38:40.021265-03
38	10	76	2026-04-30 15:38:40.900775-03
39	10	86	2026-04-30 15:38:42.029705-03
40	10	80	2026-04-30 15:38:43.328914-03
42	10	85	2026-04-30 15:38:46.048216-03
45	1	86	2026-05-05 10:09:16.590603-03
54	5	76	2026-05-20 12:00:09.661378-03
64	1	76	2026-05-28 12:07:03.71127-03
90	1	83	2026-05-28 12:16:46.967693-03
\.


--
-- TOC entry 5349 (class 0 OID 0)
-- Dependencies: 267
-- Name: anexos_comentarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.anexos_comentarios_id_seq', 2, true);


--
-- TOC entry 5350 (class 0 OID 0)
-- Dependencies: 221
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_id_seq', 20, true);


--
-- TOC entry 5351 (class 0 OID 0)
-- Dependencies: 227
-- Name: comentarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comentarios_id_seq', 44, true);


--
-- TOC entry 5352 (class 0 OID 0)
-- Dependencies: 247
-- Name: conquistas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conquistas_id_seq', 28, true);


--
-- TOC entry 5353 (class 0 OID 0)
-- Dependencies: 243
-- Name: documentacao_projeto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documentacao_projeto_id_seq', 4, true);


--
-- TOC entry 5354 (class 0 OID 0)
-- Dependencies: 239
-- Name: equipamentos_rede_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipamentos_rede_id_seq', 4, true);


--
-- TOC entry 5355 (class 0 OID 0)
-- Dependencies: 255
-- Name: historico_pontos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historico_pontos_id_seq', 74, true);


--
-- TOC entry 5356 (class 0 OID 0)
-- Dependencies: 223
-- Name: ideias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ideias_id_seq', 145, true);


--
-- TOC entry 5357 (class 0 OID 0)
-- Dependencies: 237
-- Name: ideias_imagens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ideias_imagens_id_seq', 27, true);


--
-- TOC entry 5358 (class 0 OID 0)
-- Dependencies: 257
-- Name: locais_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.locais_id_seq', 9, true);


--
-- TOC entry 5359 (class 0 OID 0)
-- Dependencies: 231
-- Name: logs_auditoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.logs_auditoria_id_seq', 18, true);


--
-- TOC entry 5360 (class 0 OID 0)
-- Dependencies: 241
-- Name: logs_detalhados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.logs_detalhados_id_seq', 2, true);


--
-- TOC entry 5361 (class 0 OID 0)
-- Dependencies: 245
-- Name: metricas_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.metricas_cache_id_seq', 1, false);


--
-- TOC entry 5362 (class 0 OID 0)
-- Dependencies: 253
-- Name: notificacoes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notificacoes_id_seq', 33, true);


--
-- TOC entry 5363 (class 0 OID 0)
-- Dependencies: 259
-- Name: periodos_submissao_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.periodos_submissao_id_seq', 23, true);


--
-- TOC entry 5364 (class 0 OID 0)
-- Dependencies: 251
-- Name: pontuacao_usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pontuacao_usuario_id_seq', 90, true);


--
-- TOC entry 5365 (class 0 OID 0)
-- Dependencies: 265
-- Name: preferencias_notificacoes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.preferencias_notificacoes_id_seq', 9, true);


--
-- TOC entry 5366 (class 0 OID 0)
-- Dependencies: 229
-- Name: projetos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projetos_id_seq', 13, true);


--
-- TOC entry 5367 (class 0 OID 0)
-- Dependencies: 235
-- Name: projetos_lixeira_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projetos_lixeira_id_seq', 13, true);


--
-- TOC entry 5368 (class 0 OID 0)
-- Dependencies: 269
-- Name: reports_comentarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_comentarios_id_seq', 6, true);


--
-- TOC entry 5369 (class 0 OID 0)
-- Dependencies: 233
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_id_seq', 19, true);


--
-- TOC entry 5370 (class 0 OID 0)
-- Dependencies: 261
-- Name: templates_ideias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.templates_ideias_id_seq', 2, true);


--
-- TOC entry 5371 (class 0 OID 0)
-- Dependencies: 249
-- Name: usuario_conquistas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_conquistas_id_seq', 8, true);


--
-- TOC entry 5372 (class 0 OID 0)
-- Dependencies: 219
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 10, true);


--
-- TOC entry 5373 (class 0 OID 0)
-- Dependencies: 263
-- Name: versoes_ideias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.versoes_ideias_id_seq', 3, true);


--
-- TOC entry 5374 (class 0 OID 0)
-- Dependencies: 225
-- Name: votos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.votos_id_seq', 90, true);


--
-- TOC entry 5069 (class 2606 OID 25108)
-- Name: anexos_comentarios anexos_comentarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anexos_comentarios
    ADD CONSTRAINT anexos_comentarios_pkey PRIMARY KEY (id);


--
-- TOC entry 4987 (class 2606 OID 16418)
-- Name: categorias categorias_nome_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nome_key UNIQUE (nome);


--
-- TOC entry 4989 (class 2606 OID 16416)
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- TOC entry 5004 (class 2606 OID 16537)
-- Name: comentarios comentarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comentarios
    ADD CONSTRAINT comentarios_pkey PRIMARY KEY (id);


--
-- TOC entry 5038 (class 2606 OID 24880)
-- Name: conquistas conquistas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conquistas
    ADD CONSTRAINT conquistas_pkey PRIMARY KEY (id);


--
-- TOC entry 5034 (class 2606 OID 24838)
-- Name: documentacao_projeto documentacao_projeto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentacao_projeto
    ADD CONSTRAINT documentacao_projeto_pkey PRIMARY KEY (id);


--
-- TOC entry 5025 (class 2606 OID 24795)
-- Name: equipamentos_rede equipamentos_rede_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipamentos_rede
    ADD CONSTRAINT equipamentos_rede_pkey PRIMARY KEY (id);


--
-- TOC entry 5052 (class 2606 OID 24962)
-- Name: historico_pontos historico_pontos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_pontos
    ADD CONSTRAINT historico_pontos_pkey PRIMARY KEY (id);


--
-- TOC entry 5023 (class 2606 OID 24743)
-- Name: ideias_imagens ideias_imagens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias_imagens
    ADD CONSTRAINT ideias_imagens_pkey PRIMARY KEY (id);


--
-- TOC entry 4991 (class 2606 OID 16433)
-- Name: ideias ideias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias
    ADD CONSTRAINT ideias_pkey PRIMARY KEY (id);


--
-- TOC entry 5054 (class 2606 OID 24983)
-- Name: locais locais_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locais
    ADD CONSTRAINT locais_pkey PRIMARY KEY (id);


--
-- TOC entry 5013 (class 2606 OID 16650)
-- Name: logs_auditoria logs_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_pkey PRIMARY KEY (id);


--
-- TOC entry 5032 (class 2606 OID 24815)
-- Name: logs_detalhados logs_detalhados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs_detalhados
    ADD CONSTRAINT logs_detalhados_pkey PRIMARY KEY (id);


--
-- TOC entry 5036 (class 2606 OID 24865)
-- Name: metricas_cache metricas_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metricas_cache
    ADD CONSTRAINT metricas_cache_pkey PRIMARY KEY (id);


--
-- TOC entry 5050 (class 2606 OID 24938)
-- Name: notificacoes notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id);


--
-- TOC entry 5056 (class 2606 OID 25001)
-- Name: periodos_submissao periodos_submissao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.periodos_submissao
    ADD CONSTRAINT periodos_submissao_pkey PRIMARY KEY (id);


--
-- TOC entry 5044 (class 2606 OID 24917)
-- Name: pontuacao_usuario pontuacao_usuario_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pontuacao_usuario
    ADD CONSTRAINT pontuacao_usuario_id_usuario_key UNIQUE (id_usuario);


--
-- TOC entry 5046 (class 2606 OID 24915)
-- Name: pontuacao_usuario pontuacao_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pontuacao_usuario
    ADD CONSTRAINT pontuacao_usuario_pkey PRIMARY KEY (id);


--
-- TOC entry 5065 (class 2606 OID 25086)
-- Name: preferencias_notificacoes preferencias_notificacoes_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preferencias_notificacoes
    ADD CONSTRAINT preferencias_notificacoes_id_usuario_key UNIQUE (id_usuario);


--
-- TOC entry 5067 (class 2606 OID 25084)
-- Name: preferencias_notificacoes preferencias_notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preferencias_notificacoes
    ADD CONSTRAINT preferencias_notificacoes_pkey PRIMARY KEY (id);


--
-- TOC entry 5021 (class 2606 OID 24710)
-- Name: projetos_lixeira projetos_lixeira_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos_lixeira
    ADD CONSTRAINT projetos_lixeira_pkey PRIMARY KEY (id);


--
-- TOC entry 5011 (class 2606 OID 16561)
-- Name: projetos projetos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_pkey PRIMARY KEY (id);


--
-- TOC entry 5074 (class 2606 OID 25132)
-- Name: reports_comentarios reports_comentarios_id_comentario_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports_comentarios
    ADD CONSTRAINT reports_comentarios_id_comentario_id_usuario_key UNIQUE (id_comentario, id_usuario);


--
-- TOC entry 5076 (class 2606 OID 25130)
-- Name: reports_comentarios reports_comentarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports_comentarios
    ADD CONSTRAINT reports_comentarios_pkey PRIMARY KEY (id);


--
-- TOC entry 5017 (class 2606 OID 24680)
-- Name: reports reports_id_usuario_id_ideia_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_id_usuario_id_ideia_key UNIQUE (id_usuario, id_ideia);


--
-- TOC entry 5019 (class 2606 OID 24678)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5058 (class 2606 OID 25029)
-- Name: templates_ideias templates_ideias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates_ideias
    ADD CONSTRAINT templates_ideias_pkey PRIMARY KEY (id);


--
-- TOC entry 5000 (class 2606 OID 16456)
-- Name: votos unique_voto; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votos
    ADD CONSTRAINT unique_voto UNIQUE (id_usuario, id_ideia);


--
-- TOC entry 5040 (class 2606 OID 24893)
-- Name: usuario_conquistas usuario_conquistas_id_usuario_id_conquista_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_conquistas
    ADD CONSTRAINT usuario_conquistas_id_usuario_id_conquista_key UNIQUE (id_usuario, id_conquista);


--
-- TOC entry 5042 (class 2606 OID 24891)
-- Name: usuario_conquistas usuario_conquistas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_conquistas
    ADD CONSTRAINT usuario_conquistas_pkey PRIMARY KEY (id);


--
-- TOC entry 4983 (class 2606 OID 16405)
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- TOC entry 4985 (class 2606 OID 16403)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 5062 (class 2606 OID 25049)
-- Name: versoes_ideias versoes_ideias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versoes_ideias
    ADD CONSTRAINT versoes_ideias_pkey PRIMARY KEY (id);


--
-- TOC entry 5002 (class 2606 OID 16454)
-- Name: votos votos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votos
    ADD CONSTRAINT votos_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 1259 OID 25115)
-- Name: idx_anexos_comentario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_anexos_comentario ON public.anexos_comentarios USING btree (id_comentario);


--
-- TOC entry 5005 (class 1259 OID 16680)
-- Name: idx_comentarios_ideia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comentarios_ideia ON public.comentarios USING btree (id_ideia);


--
-- TOC entry 5006 (class 1259 OID 16681)
-- Name: idx_comentarios_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comentarios_usuario ON public.comentarios USING btree (id_usuario);


--
-- TOC entry 5026 (class 1259 OID 24801)
-- Name: idx_equipamentos_projeto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_equipamentos_projeto ON public.equipamentos_rede USING btree (id_projeto);


--
-- TOC entry 5027 (class 1259 OID 24802)
-- Name: idx_equipamentos_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_equipamentos_tipo ON public.equipamentos_rede USING btree (tipo);


--
-- TOC entry 4992 (class 1259 OID 16468)
-- Name: idx_ideias_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ideias_categoria ON public.ideias USING btree (categoria_id);


--
-- TOC entry 4993 (class 1259 OID 16469)
-- Name: idx_ideias_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ideias_data ON public.ideias USING btree (data_publicacao DESC);


--
-- TOC entry 4994 (class 1259 OID 16684)
-- Name: idx_ideias_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ideias_status ON public.ideias USING btree (status);


--
-- TOC entry 4995 (class 1259 OID 16467)
-- Name: idx_ideias_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ideias_usuario ON public.ideias USING btree (id_usuario);


--
-- TOC entry 4996 (class 1259 OID 16685)
-- Name: idx_ideias_votos; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ideias_votos ON public.ideias USING btree (votos_count);


--
-- TOC entry 5028 (class 1259 OID 24822)
-- Name: idx_logs_acao; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_acao ON public.logs_detalhados USING btree (acao);


--
-- TOC entry 5029 (class 1259 OID 24823)
-- Name: idx_logs_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_data ON public.logs_detalhados USING btree (data_acao DESC);


--
-- TOC entry 5030 (class 1259 OID 24821)
-- Name: idx_logs_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_usuario ON public.logs_detalhados USING btree (id_usuario);


--
-- TOC entry 5047 (class 1259 OID 24950)
-- Name: idx_notificacoes_lida; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notificacoes_lida ON public.notificacoes USING btree (lida);


--
-- TOC entry 5048 (class 1259 OID 24949)
-- Name: idx_notificacoes_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notificacoes_usuario ON public.notificacoes USING btree (id_usuario);


--
-- TOC entry 5063 (class 1259 OID 25114)
-- Name: idx_preferencias_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_preferencias_usuario ON public.preferencias_notificacoes USING btree (id_usuario);


--
-- TOC entry 5007 (class 1259 OID 24716)
-- Name: idx_projetos_deletado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projetos_deletado ON public.projetos USING btree (deletado);


--
-- TOC entry 5008 (class 1259 OID 16683)
-- Name: idx_projetos_prioridade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projetos_prioridade ON public.projetos USING btree (prioridade);


--
-- TOC entry 5009 (class 1259 OID 16682)
-- Name: idx_projetos_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projetos_status ON public.projetos USING btree (status);


--
-- TOC entry 5071 (class 1259 OID 25149)
-- Name: idx_reports_comentario_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_comentario_data ON public.reports_comentarios USING btree (data_report);


--
-- TOC entry 5072 (class 1259 OID 25148)
-- Name: idx_reports_comentario_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_comentario_status ON public.reports_comentarios USING btree (status);


--
-- TOC entry 5014 (class 1259 OID 24697)
-- Name: idx_reports_ideia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_ideia ON public.reports USING btree (id_ideia);


--
-- TOC entry 5015 (class 1259 OID 24696)
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- TOC entry 5059 (class 1259 OID 25066)
-- Name: idx_versoes_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_versoes_data ON public.versoes_ideias USING btree (data_alteracao);


--
-- TOC entry 5060 (class 1259 OID 25065)
-- Name: idx_versoes_id_ideia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_versoes_id_ideia ON public.versoes_ideias USING btree (id_ideia);


--
-- TOC entry 4997 (class 1259 OID 16470)
-- Name: idx_votos_ideia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votos_ideia ON public.votos USING btree (id_ideia);


--
-- TOC entry 4998 (class 1259 OID 16471)
-- Name: idx_votos_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votos_usuario ON public.votos USING btree (id_usuario);


--
-- TOC entry 5117 (class 2620 OID 16689)
-- Name: votos trigger_atualizar_votos; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_atualizar_votos AFTER INSERT OR DELETE ON public.votos FOR EACH ROW EXECUTE FUNCTION public.atualizar_votos_count();


--
-- TOC entry 5113 (class 2606 OID 25109)
-- Name: anexos_comentarios anexos_comentarios_id_comentario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anexos_comentarios
    ADD CONSTRAINT anexos_comentarios_id_comentario_fkey FOREIGN KEY (id_comentario) REFERENCES public.comentarios(id) ON DELETE CASCADE;


--
-- TOC entry 5086 (class 2606 OID 16543)
-- Name: comentarios comentarios_id_ideia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comentarios
    ADD CONSTRAINT comentarios_id_ideia_fkey FOREIGN KEY (id_ideia) REFERENCES public.ideias(id) ON DELETE CASCADE;


--
-- TOC entry 5087 (class 2606 OID 16538)
-- Name: comentarios comentarios_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comentarios
    ADD CONSTRAINT comentarios_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5098 (class 2606 OID 24849)
-- Name: documentacao_projeto documentacao_projeto_atualizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentacao_projeto
    ADD CONSTRAINT documentacao_projeto_atualizado_por_fkey FOREIGN KEY (atualizado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5099 (class 2606 OID 24844)
-- Name: documentacao_projeto documentacao_projeto_criado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentacao_projeto
    ADD CONSTRAINT documentacao_projeto_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5100 (class 2606 OID 24839)
-- Name: documentacao_projeto documentacao_projeto_id_projeto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentacao_projeto
    ADD CONSTRAINT documentacao_projeto_id_projeto_fkey FOREIGN KEY (id_projeto) REFERENCES public.projetos(id) ON DELETE CASCADE;


--
-- TOC entry 5096 (class 2606 OID 24796)
-- Name: equipamentos_rede equipamentos_rede_id_projeto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipamentos_rede
    ADD CONSTRAINT equipamentos_rede_id_projeto_fkey FOREIGN KEY (id_projeto) REFERENCES public.projetos(id) ON DELETE CASCADE;


--
-- TOC entry 5077 (class 2606 OID 16439)
-- Name: ideias fk_ideias_categoria; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias
    ADD CONSTRAINT fk_ideias_categoria FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;


--
-- TOC entry 5078 (class 2606 OID 16434)
-- Name: ideias fk_ideias_usuario; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias
    ADD CONSTRAINT fk_ideias_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5084 (class 2606 OID 16462)
-- Name: votos fk_votos_ideia; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votos
    ADD CONSTRAINT fk_votos_ideia FOREIGN KEY (id_ideia) REFERENCES public.ideias(id) ON DELETE CASCADE;


--
-- TOC entry 5085 (class 2606 OID 16457)
-- Name: votos fk_votos_usuario; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votos
    ADD CONSTRAINT fk_votos_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5106 (class 2606 OID 24963)
-- Name: historico_pontos historico_pontos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_pontos
    ADD CONSTRAINT historico_pontos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5079 (class 2606 OID 16633)
-- Name: ideias ideias_aprovada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias
    ADD CONSTRAINT ideias_aprovada_por_fkey FOREIGN KEY (aprovada_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5080 (class 2606 OID 25067)
-- Name: ideias ideias_editada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias
    ADD CONSTRAINT ideias_editada_por_fkey FOREIGN KEY (editada_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5081 (class 2606 OID 24984)
-- Name: ideias ideias_id_local_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias
    ADD CONSTRAINT ideias_id_local_fkey FOREIGN KEY (id_local) REFERENCES public.locais(id) ON DELETE SET NULL;


--
-- TOC entry 5082 (class 2606 OID 25007)
-- Name: ideias ideias_id_periodo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias
    ADD CONSTRAINT ideias_id_periodo_fkey FOREIGN KEY (id_periodo) REFERENCES public.periodos_submissao(id) ON DELETE SET NULL;


--
-- TOC entry 5083 (class 2606 OID 16573)
-- Name: ideias ideias_id_projeto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias
    ADD CONSTRAINT ideias_id_projeto_fkey FOREIGN KEY (id_projeto) REFERENCES public.projetos(id) ON DELETE SET NULL;


--
-- TOC entry 5095 (class 2606 OID 24744)
-- Name: ideias_imagens ideias_imagens_id_ideia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ideias_imagens
    ADD CONSTRAINT ideias_imagens_id_ideia_fkey FOREIGN KEY (id_ideia) REFERENCES public.ideias(id) ON DELETE CASCADE;


--
-- TOC entry 5090 (class 2606 OID 16651)
-- Name: logs_auditoria logs_auditoria_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id);


--
-- TOC entry 5097 (class 2606 OID 24816)
-- Name: logs_detalhados logs_detalhados_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs_detalhados
    ADD CONSTRAINT logs_detalhados_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5104 (class 2606 OID 24944)
-- Name: notificacoes notificacoes_id_ideia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_id_ideia_fkey FOREIGN KEY (id_ideia) REFERENCES public.ideias(id) ON DELETE SET NULL;


--
-- TOC entry 5105 (class 2606 OID 24939)
-- Name: notificacoes notificacoes_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5107 (class 2606 OID 25002)
-- Name: periodos_submissao periodos_submissao_criado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.periodos_submissao
    ADD CONSTRAINT periodos_submissao_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5103 (class 2606 OID 24918)
-- Name: pontuacao_usuario pontuacao_usuario_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pontuacao_usuario
    ADD CONSTRAINT pontuacao_usuario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5112 (class 2606 OID 25087)
-- Name: preferencias_notificacoes preferencias_notificacoes_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preferencias_notificacoes
    ADD CONSTRAINT preferencias_notificacoes_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5088 (class 2606 OID 16562)
-- Name: projetos projetos_id_ideia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_id_ideia_fkey FOREIGN KEY (id_ideia) REFERENCES public.ideias(id) ON DELETE SET NULL;


--
-- TOC entry 5089 (class 2606 OID 16567)
-- Name: projetos projetos_id_responsavel_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_id_responsavel_fkey FOREIGN KEY (id_responsavel) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 5094 (class 2606 OID 24711)
-- Name: projetos_lixeira projetos_lixeira_deletado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projetos_lixeira
    ADD CONSTRAINT projetos_lixeira_deletado_por_fkey FOREIGN KEY (deletado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5114 (class 2606 OID 25133)
-- Name: reports_comentarios reports_comentarios_id_comentario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports_comentarios
    ADD CONSTRAINT reports_comentarios_id_comentario_fkey FOREIGN KEY (id_comentario) REFERENCES public.comentarios(id) ON DELETE CASCADE;


--
-- TOC entry 5115 (class 2606 OID 25138)
-- Name: reports_comentarios reports_comentarios_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports_comentarios
    ADD CONSTRAINT reports_comentarios_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5116 (class 2606 OID 25143)
-- Name: reports_comentarios reports_comentarios_resolvido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports_comentarios
    ADD CONSTRAINT reports_comentarios_resolvido_por_fkey FOREIGN KEY (resolvido_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5091 (class 2606 OID 24686)
-- Name: reports reports_id_ideia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_id_ideia_fkey FOREIGN KEY (id_ideia) REFERENCES public.ideias(id) ON DELETE CASCADE;


--
-- TOC entry 5092 (class 2606 OID 24681)
-- Name: reports reports_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5093 (class 2606 OID 24691)
-- Name: reports reports_resolvido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resolvido_por_fkey FOREIGN KEY (resolvido_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5108 (class 2606 OID 25030)
-- Name: templates_ideias templates_ideias_criado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates_ideias
    ADD CONSTRAINT templates_ideias_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5101 (class 2606 OID 24899)
-- Name: usuario_conquistas usuario_conquistas_id_conquista_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_conquistas
    ADD CONSTRAINT usuario_conquistas_id_conquista_fkey FOREIGN KEY (id_conquista) REFERENCES public.conquistas(id);


--
-- TOC entry 5102 (class 2606 OID 24894)
-- Name: usuario_conquistas usuario_conquistas_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_conquistas
    ADD CONSTRAINT usuario_conquistas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5109 (class 2606 OID 25060)
-- Name: versoes_ideias versoes_ideias_alterado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versoes_ideias
    ADD CONSTRAINT versoes_ideias_alterado_por_fkey FOREIGN KEY (alterado_por) REFERENCES public.usuarios(id);


--
-- TOC entry 5110 (class 2606 OID 25055)
-- Name: versoes_ideias versoes_ideias_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versoes_ideias
    ADD CONSTRAINT versoes_ideias_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- TOC entry 5111 (class 2606 OID 25050)
-- Name: versoes_ideias versoes_ideias_id_ideia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versoes_ideias
    ADD CONSTRAINT versoes_ideias_id_ideia_fkey FOREIGN KEY (id_ideia) REFERENCES public.ideias(id) ON DELETE CASCADE;


-- Completed on 2026-05-28 17:04:49

--
-- PostgreSQL database dump complete
--

\unrestrict ODdMvDPE9NvU5aX6stKwnVktytjrIjzxsDGPFUP5FCLvElaSYDYNchHPQOf8QGv

