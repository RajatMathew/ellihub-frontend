#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE=".env"
ENV_PATH="${PROJECT_DIR}/${ENV_FILE}"

cd "${PROJECT_DIR}"

if [[ ! -f "${ENV_PATH}" ]]; then
    echo "Env file not found: ${ENV_PATH}" >&2
    exit 1
fi

read_env_value() {
    local key="$1"
    awk -F= -v key="${key}" '
        $0 ~ "^[[:space:]]*#" { next }
        $1 ~ "^[[:space:]]*" key "[[:space:]]*$" {
            value = substr($0, index($0, "=") + 1)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
            gsub(/^"|"$/, "", value)
            gsub(/^'\''|'\''$/, "", value)
            print value
            exit
        }
    ' "${ENV_PATH}"
}

repeat_char() {
    local char="$1"
    local count="$2"
    local output=""

    for ((i = 0; i < count; i++)); do
        output+="${char}"
    done

    printf "%s" "${output}"
}

box_border() {
    printf "+"
    repeat_char "-" 76
    printf "+\n"
}

box_line() {
    local text="${1:-}"
    local width=74

    if [[ -z "${text}" ]]; then
        printf "| %-74s |\n" ""
        return
    fi

    while [[ ${#text} -gt ${width} ]]; do
        printf "| %-74s |\n" "${text:0:${width}}"
        text="${text:${width}}"
    done

    printf "| %-74s |\n" "${text}"
}

NODE_ENV_VALUE="${NODE_ENV:-$(read_env_value NODE_ENV)}"
DATABASE_URL_VALUE="${DATABASE_URL:-$(read_env_value DATABASE_URL)}"
CONFIRM_WORDS=(
    banana
    bubblegum
    carousel
    confetti
    cookie
    cupcake
    disco
    firework
    glitter
    jellybean
    kazoo
    marshmallow
    moonwalk
    pancake
    pickle
    popcorn
    pretzel
    rainbow
    rocket
    skate
    slinky
    snowcone
    sparkle
    taco
    waffle
)
CONFIRM_WORD="${CONFIRM_WORDS[$((RANDOM % ${#CONFIRM_WORDS[@]}))]}"

box_border
box_line "DATABASE RESET WARNING"
box_border
box_line "Action: prisma migrate reset"
box_line "Data loss: all database data will be deleted"
box_line "Prisma env file: ${ENV_FILE}"
box_line "NODE_ENV: ${NODE_ENV_VALUE:-not set}"

if [[ "${NODE_ENV_VALUE:-}" == "production" ]]; then
    box_line "WARNING: NODE_ENV is production"
fi

if [[ -n "${DATABASE_URL_VALUE:-}" ]]; then
    box_line "DATABASE_URL: ${DATABASE_URL_VALUE}"
else
    box_line "WARNING: DATABASE_URL was not found in the environment or ${ENV_FILE}"
fi

box_border

printf "Continue? [y/N] "
read -r answer

case "${answer}" in
    y|Y)
        printf "Type \"%s\" to confirm: " "${CONFIRM_WORD}"
        read -r typed_word

        if [[ "${typed_word}" != "${CONFIRM_WORD}" ]]; then
            echo "Confirmation word did not match. Cancelled."
            exit 0
        fi

        bunx prisma migrate reset
        ;;
    *)
        echo "Cancelled."
        exit 0
        ;;
esac
